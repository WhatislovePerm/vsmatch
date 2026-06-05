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

        // Импортёр полностью идемпотент: внутри ImportAsync дедуп по OsmId.
        // Раньше тут был early-return по hasAny, но если предыдущая попытка
        // сорвалась после получения данных — мы зря бы пропустили заход.
        var http = _httpFactory.CreateClient();
        http.DefaultRequestHeaders.UserAgent.ParseAdd("VSMatch/1.0 (+https://vsmatch.ru)");
        http.Timeout = TimeSpan.FromMinutes(3);

        {
            var (added, skipped) = await ImportAsync(http, SportKind.Basketball,
                BuildAreaQuery("basketball", areaName: "Москва", adminLevel: "4"), ct);
            _log.LogInformation("OsmCourtImporter [Basketball]: добавлено {Added}, дубликатов пропущено {Skipped}", added, skipped);
        }

        {
            var (added, skipped) = await ImportAsync(http, SportKind.TableTennis,
                BuildAreaQuery("table_tennis", areaName: "Северный административный округ", adminLevel: "5"), ct);
            _log.LogInformation("OsmCourtImporter [TableTennis]: добавлено {Added}, дубликатов пропущено {Skipped}", added, skipped);
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

    private async Task<(int added, int skipped)> ImportAsync(HttpClient http, SportKind sport, string query, CancellationToken ct)
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
                return (0, 0);
            }

            doc = await resp.Content.ReadFromJsonAsync<OverpassResponse>(cancellationToken: ct);
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Overpass request failed for {Sport}", sport);
            return (0, 0);
        }

        if (doc?.Elements is null || doc.Elements.Length == 0)
        {
            _log.LogWarning("OsmCourtImporter: пустой ответ Overpass для {Sport}", sport);
            return (0, 0);
        }

        _log.LogInformation("OsmCourtImporter: Overpass вернул {Count} объектов для {Sport}", doc.Elements.Length, sport);

        using var scope = _services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var existingOsmIds = (await db.Courts.AsNoTracking()
            .Select(c => c.OsmId)
            .ToListAsync(ct)).ToHashSet();

        var added = 0;
        var skippedDup = 0;
        const int BatchSize = 200;
        var batch = new List<Court>(BatchSize);

        foreach (var el in doc.Elements)
        {
            if (existingOsmIds.Contains(el.Id)) { skippedDup++; continue; }

            var (lat, lon) = ExtractCoords(el);
            if (lat is null || lon is null) continue;

            // Закрытые объекты не пускаем
            var access = GetTag(el, "access");
            if (access is "private" or "permit" or "no" or "customers") continue;

            var name = GetTag(el, "name");
            batch.Add(new Court
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
            });
            existingOsmIds.Add(el.Id);

            if (batch.Count >= BatchSize)
            {
                added += await FlushBatchAsync(db, batch, ct);
                batch.Clear();
            }
        }

        if (batch.Count > 0)
            added += await FlushBatchAsync(db, batch, ct);

        return (added, skippedDup);
    }

    /// <summary>
    /// Сохраняем пачку. Если упадёт DbUpdate (например коллизия по OsmId которой не было в нашем
    /// snapshot — между чтением и записью кто-то ещё мог добавить), пробуем по одной.
    /// </summary>
    private async Task<int> FlushBatchAsync(AppDbContext db, List<Court> batch, CancellationToken ct)
    {
        db.Courts.AddRange(batch);
        try
        {
            await db.SaveChangesAsync(ct);
            return batch.Count;
        }
        catch (DbUpdateException)
        {
            // Откатим трекинг и пробуем по одной — выживут все, кроме конкретного нарушителя.
            foreach (var c in batch) db.Entry(c).State = EntityState.Detached;

            var ok = 0;
            foreach (var c in batch)
            {
                try
                {
                    db.Courts.Add(c);
                    await db.SaveChangesAsync(ct);
                    ok++;
                }
                catch (DbUpdateException ex)
                {
                    db.Entry(c).State = EntityState.Detached;
                    _log.LogWarning("Пропуск корта osm_id={OsmId}: {Reason}", c.OsmId, ex.InnerException?.Message ?? ex.Message);
                }
            }
            return ok;
        }
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
