namespace VSMatch.Domain.Sports;

public enum SportKind
{
    Football = 0,
    Basketball = 1,
    TableTennis = 2,
}

public record SportInfo(
    string Label,
    string Emoji,
    string[] OsmSportTags);

public static class SportCatalog
{
    public static readonly IReadOnlyDictionary<SportKind, SportInfo> All =
        new Dictionary<SportKind, SportInfo>
        {
            [SportKind.Football]    = new("Футбол",    "⚽", new[] { "soccer", "football" }),
            [SportKind.Basketball]  = new("Баскетбол", "🏀", new[] { "basketball" }),
            [SportKind.TableTennis] = new("Теннис",    "🏓", new[] { "table_tennis" }),
        };

    public static SportInfo Get(SportKind kind) => All[kind];
    public static SportKind DefaultSport => SportKind.Football;
}
