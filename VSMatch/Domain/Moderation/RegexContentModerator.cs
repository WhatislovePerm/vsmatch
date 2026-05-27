using System.Text.Json;
using System.Text.RegularExpressions;

namespace VSMatch.Domain.Moderation;

public class RegexContentModerator : IContentModerator
{
    private readonly Regex[] _patterns;
    private readonly HashSet<string> _whitelist;

    public RegexContentModerator(IHostEnvironment env)
    {
        var path = Path.Combine(env.ContentRootPath, "Data", "forbidden_content.ru.json");
        if (!File.Exists(path))
            throw new FileNotFoundException($"Forbidden content dictionary not found: {path}");

        var doc = JsonSerializer.Deserialize<ForbiddenContent>(
            File.ReadAllText(path),
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
            ?? throw new InvalidOperationException("Forbidden content dictionary is empty.");

        _patterns = doc.Patterns
            .SelectMany(kv => kv.Value)
            .Select(p => new Regex(p, RegexOptions.Compiled | RegexOptions.CultureInvariant))
            .ToArray();

        _whitelist = new HashSet<string>(
            doc.Whitelist ?? Array.Empty<string>(),
            StringComparer.Ordinal);
    }

    public void EnsureClean(string? value, string fieldName)
    {
        if (string.IsNullOrWhiteSpace(value)) return;

        var normalized = TextNormalizer.Normalize(value);
        if (normalized.Length == 0) return;

        foreach (var pattern in _patterns)
        {
            foreach (Match match in pattern.Matches(normalized))
            {
                if (_whitelist.Contains(match.Value)) continue;
                throw new ValidationException($"Поле \"{fieldName}\" содержит запрещённый контент.");
            }
        }
    }

    private sealed class ForbiddenContent
    {
        public Dictionary<string, string[]> Patterns { get; set; } = new();
        public string[]? Whitelist { get; set; }
    }
}
