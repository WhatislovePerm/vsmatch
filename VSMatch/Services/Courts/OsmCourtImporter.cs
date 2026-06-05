using System.Globalization;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using VSMatch.Data;
using VSMatch.Data.Entities;
using VSMatch.Domain.Sports;

namespace VSMatch.Services.Courts;

/// <summary>
/// Однократный импорт площадок из OSM через Overpass API.
/// При старте: если в БД нет ни одной площадки определённого вида спорта —
/// тянем все pitch'и из OSM по нужной области (Москва / САО),
/// фильтруем стадионы и приватные объекты, добавляем как Court'ы.
/// CourtAddressEnricher потом самостоятельно прогуляется по новым кортам
/// (он смотрит на Address IS NULL) и проставит адреса через Nominatim.
/// </summary>
public class OsmCourtImporter : BackgroundService
{
    private const string OverpassUrl = "https://overpass-api.de/api/interpreter";

    private readonly IServiceProvider _services;
    private readonly IHttpClientFactory _httpFactory;
    private readonly ILogger<OsmCourtImporter> _log;

    public OsmCourtImporter(IServiceProvider services, IHttpClientFactory httpFactory, ILogger<OsmCourtImporter> log)
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
            _log.LogError(ex, "OsmCourtImporter aborted; API продолжит работу.");
        }
    }

    private async Task RunAsync(CancellationToken ct)
    {
        // Прогрев — пускай миграции/Enricher успеют стартовать
        try { await Task.Delay(TimeSpan.FromSeconds(15), ct); }
        catch (OperationCanceledException) { return; }

        bool hasBasketball;
        bool hasTableTennis;
        using (var scope = _services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            hasBasketball  = await db.Courts.AnyAsync(c => c.SportKind == SportKind.Basketball,  ct);
            hasTableTennis = await db.Courts.AnyAsync(c => c.SportKind == SportKind.TableTennis, ct);
        }

        if (hasBasketball && hasTableTennis)
        {
            _log.LogInformation("OsmCourtImporter: все спорты уже импортированы — нечего делать.");
            return;
        }

        var http = _httpFactory.CreateClient();
        http.DefaultRequestHeaders.UserAgent.ParseAdd("VSMatch/1.0 (+https://vsmatch.ru)");
        http.Timeout = TimeSpan.FromMinutes(3);

        if (!hasBasketball)
        {
            var added = await ImportAsync(http, SportKind.Basketball,
                BuildAreaQuery("basketball", areaName: "Москва", adminLevel: "4"), ct);
            _log.LogInformation("OsmCourtImporter: добавлено баскетбольных площадок: {Added}", added);
        }

        if (!hasTableTennis)
        {
            var added = await ImportAsync(http, SportKind.TableTennis,
                BuildAreaQuery("table_tennis", areaName: "Северный административный округ", adminLevel: "5"), ct);
            _log.LogInformation("OsmCourtImporter: добавлено столов для тенниса: {Added}", added);
        }
    }

    /// <summary>
    /// Overpass-запрос: берём только leisure=pitch с нужным sport=tag в указанной admin-area.
    /// Стадионы (leisure=stadium) намеренно не включаем — туда обычным игрокам не попасть.
    /// Дополняем 'sport-only' нодами/way'ями (актуально для table_tennis: часто это просто стол в парке).
    /// </summary>
    private static string BuildAreaQuery(string sportTag, string areaName, string adminLevel)
    {
        return $@"
            [out:json][timeout:120];
            area[""name""=""{areaName}""][""admin_level""=""{adminLevel}""]->.target;
            (
              node[""leisure""=""pitch""][""sport""~""{sportTag}""](area.target);
              way[""leisure""=""pitch""][""sport""~""{sportTag}""](area.target);
              node[""sport""~""{sportTag}""](area.target);
              way[""sport""~""{sportTag}""](area.target);
            );
            out center tags;
        ";
    }

    private async Task<int> ImportAsync(HttpClient http, SportKind sport, string query, CancellationToken ct)
    {
        OverpassResponse? doc;
        try
        {
            var content = new StringContent($"data={Uri.EscapeDataString(query)}", Encoding.UTF8, "application/x-www-form-urlencoded");
            using var resp = await http.PostAsync(OverpassUrl, content, ct);
            if (!resp.IsSuccessStatusCode)
            {
                var body = await resp.Content.ReadAsStringAsync(ct);
                _log.LogWarning("Overpass {Status} для {Sport}: {Body}", resp.StatusCode, sport, Truncate(body, 500));
                return 0;
            }

            doc = await resp.Content.ReadFromJsonAsync<OverpassResponse>(cancellationToken: ct);
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Overpass request failed for {Sport}", sport);
            return 0;
        }

        if (doc?.Elements is null || doc.Elements.Length == 0)
        {
            _log.LogWarning("OsmCourtImporter: пустой ответ Overpass для {Sport}", sport);
            return 0;
        }

        _log.LogInformation("OsmCourtImporter: Overpass вернул {Count} объектов для {Sport}", doc.Elements.Length, sport);

        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var existingOsmIds = (await db.Courts.AsNoTracking()
            .Select(c => c.OsmId)
            .ToListAsync(ct)).ToHashSet();

        var added = 0;
        foreach (var el in doc.Elements)
        {
            if (existingOsmIds.Contains(el.Id)) continue;

            var (lat, lon) = ExtractCoords(el);
            if (lat is null || lon is null) continue;

            // Закрытые объекты не пускаем
            var access = GetTag(el, "access");
            if (access is "private" or "permit" or "no" or "customers") continue;

            var name = GetTag(el, "name");
            var court = new Court
            {
                Id = Guid.NewGuid(),
                OsmId = el.Id,
                SportKind = sport,
                Name = string.IsNullOrWhiteSpace(name) ? $"Площадка #{el.Id}" : name,
                Sport = GetTag(el, "sport"),
                Surface = GetTag(el, "surface"),
                Lat = lat.Value,
                Lon = lon.Value,
                IsFree = true,
                CreatedAt = DateTime.UtcNow,
            };
            db.Courts.Add(court);
            existingOsmIds.Add(el.Id);
            added++;
        }

        if (added > 0)
            await db.SaveChangesAsync(ct);

        return added;
    }

    private static (double? lat, double? lon) ExtractCoords(OverpassElement el)
    {
        if (el.Lat.HasValue && el.Lon.HasValue) return (el.Lat, el.Lon);
        if (el.Center is not null) return (el.Center.Lat, el.Center.Lon);
        return (null, null);
    }

    private static string? GetTag(OverpassElement el, string key)
        => el.Tags is not null && el.Tags.TryGetValue(key, out var v) ? v : null;

    private static string Truncate(string s, int max) => s.Length <= max ? s : s[..max] + "…";

    private class OverpassResponse
    {
        [JsonPropertyName("elements")] public OverpassElement[]? Elements { get; set; }
    }

    private class OverpassElement
    {
        [JsonPropertyName("type")] public string? Type { get; set; }
        [JsonPropertyName("id")] public long Id { get; set; }
        [JsonPropertyName("lat")] public double? Lat { get; set; }
        [JsonPropertyName("lon")] public double? Lon { get; set; }
        [JsonPropertyName("center")] public OverpassCenter? Center { get; set; }
        [JsonPropertyName("tags")] public Dictionary<string, string>? Tags { get; set; }
    }

    private class OverpassCenter
    {
        [JsonPropertyName("lat")] public double Lat { get; set; }
        [JsonPropertyName("lon")] public double Lon { get; set; }
    }
}
