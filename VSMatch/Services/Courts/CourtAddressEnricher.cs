using System.Globalization;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using VSMatch.Data;

namespace VSMatch.Services.Courts;

/// <summary>
/// Один раз на старте API проходит по всем кортам без адреса и
/// делает reverse geocoding через публичный Nominatim (OSM).
/// Лимит политики Nominatim: ≤ 1 запрос/сек + явный User-Agent.
/// </summary>
public class CourtAddressEnricher : BackgroundService
{
    private const string NominatimUrl = "https://nominatim.openstreetmap.org/reverse";
    private static readonly TimeSpan RateLimit = TimeSpan.FromMilliseconds(1100);

    private readonly IServiceProvider _services;
    private readonly IHttpClientFactory _httpFactory;
    private readonly ILogger<CourtAddressEnricher> _log;

    public CourtAddressEnricher(
        IServiceProvider services,
        IHttpClientFactory httpFactory,
        ILogger<CourtAddressEnricher> log)
    {
        _services = services;
        _httpFactory = httpFactory;
        _log = log;
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        try
        {
            await RunAsync(ct);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested) { /* shutdown */ }
        catch (Exception ex)
        {
            // Фоновая обогаталка адресов не должна валить весь API.
            _log.LogError(ex, "CourtAddressEnricher aborted with an unexpected exception; API продолжит работу.");
        }
    }

    private async Task RunAsync(CancellationToken ct)
    {
        // Дать API время прогреться
        try { await Task.Delay(TimeSpan.FromSeconds(10), ct); }
        catch (OperationCanceledException) { return; }

        List<Guid> courtIds;
        using (var scope = _services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            courtIds = await db.Courts
                .Where(c => c.Address == null)
                .OrderBy(c => c.OsmId)
                .Select(c => c.Id)
                .ToListAsync(ct);
        }

        if (courtIds.Count == 0)
        {
            _log.LogInformation("CourtAddressEnricher: всё уже геокодировано.");
            return;
        }

        _log.LogInformation("CourtAddressEnricher: {Count} коробок без адреса — начинаю geocoding.", courtIds.Count);

        var http = _httpFactory.CreateClient();
        http.DefaultRequestHeaders.UserAgent.ParseAdd("VSMatch/1.0 (+https://vsmatch.ru)");
        http.DefaultRequestHeaders.AcceptLanguage.ParseAdd("ru");
        http.Timeout = TimeSpan.FromSeconds(15);

        var enriched = 0;
        foreach (var id in courtIds)
        {
            if (ct.IsCancellationRequested) break;

            try
            {
                using var scope = _services.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var court = await db.Courts.FirstOrDefaultAsync(c => c.Id == id, ct);
                if (court is null) continue;

                var url = string.Format(
                    CultureInfo.InvariantCulture,
                    "{0}?format=jsonv2&lat={1}&lon={2}&zoom=18&addressdetails=1&accept-language=ru",
                    NominatimUrl, court.Lat, court.Lon);

                using var resp = await http.GetAsync(url, ct);
                if (!resp.IsSuccessStatusCode)
                {
                    _log.LogWarning("Nominatim {Status} для osm_id={OsmId}", resp.StatusCode, court.OsmId);
                }
                else
                {
                    var body = await resp.Content.ReadFromJsonAsync<NominatimResponse>(cancellationToken: ct);
                    var addr = body?.Address;
                    var street = addr?.Road ?? addr?.Pedestrian ?? addr?.Footway ?? addr?.Path
                                 ?? addr?.Cycleway ?? addr?.Suburb ?? addr?.Neighbourhood;
                    var house = addr?.HouseNumber;

                    var addressText = BuildAddress(street, house);
                    if (!string.IsNullOrWhiteSpace(addressText))
                    {
                        court.Address = addressText;
                        court.Name = $"Площадка на {addressText}";
                        await db.SaveChangesAsync(ct);
                        enriched++;
                    }
                }
            }
            catch (OperationCanceledException) { break; }
            catch (Exception ex)
            {
                _log.LogWarning(ex, "Не удалось геокодировать корт {Id}", id);
            }

            try { await Task.Delay(RateLimit, ct); }
            catch (OperationCanceledException) { break; }
        }

        _log.LogInformation("CourtAddressEnricher: готово. Заполнено адресов: {Enriched} из {Total}.", enriched, courtIds.Count);
    }

    private static string? BuildAddress(string? street, string? house)
    {
        if (string.IsNullOrWhiteSpace(street)) return null;
        var s = street.Trim();
        if (string.IsNullOrWhiteSpace(house)) return s;
        return $"{s}, {house.Trim()}";
    }

    private class NominatimResponse
    {
        [JsonPropertyName("address")] public NominatimAddress? Address { get; set; }
    }

    private class NominatimAddress
    {
        [JsonPropertyName("road")] public string? Road { get; set; }
        [JsonPropertyName("pedestrian")] public string? Pedestrian { get; set; }
        [JsonPropertyName("footway")] public string? Footway { get; set; }
        [JsonPropertyName("path")] public string? Path { get; set; }
        [JsonPropertyName("cycleway")] public string? Cycleway { get; set; }
        [JsonPropertyName("suburb")] public string? Suburb { get; set; }
        [JsonPropertyName("neighbourhood")] public string? Neighbourhood { get; set; }
        [JsonPropertyName("house_number")] public string? HouseNumber { get; set; }
    }
}
