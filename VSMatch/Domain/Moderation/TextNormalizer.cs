using System.Text;
using System.Text.RegularExpressions;

namespace VSMatch.Domain.Moderation;

public static class TextNormalizer
{
    private static readonly Dictionary<char, char> Homoglyphs = new()
    {
        ['a'] = 'а', ['b'] = 'в', ['c'] = 'с', ['e'] = 'е', ['h'] = 'н',
        ['k'] = 'к', ['m'] = 'м', ['o'] = 'о', ['p'] = 'р', ['t'] = 'т',
        ['x'] = 'х', ['y'] = 'у',
    };

    private static readonly Dictionary<char, char> Leet = new()
    {
        ['0'] = 'о', ['3'] = 'з', ['4'] = 'ч', ['6'] = 'б', ['8'] = 'в',
        ['@'] = 'а', ['$'] = 'с',
    };

    private static readonly Regex Separators = new(
        @"(?<=\p{IsCyrillic})[\s\.\-_\*'""`~]+(?=\p{IsCyrillic})",
        RegexOptions.Compiled);

    private static readonly Regex Repeats = new(
        @"(\p{L})\1+",
        RegexOptions.Compiled);

    public static string Normalize(string? input)
    {
        if (string.IsNullOrWhiteSpace(input)) return string.Empty;

        var lowered = input.Normalize(NormalizationForm.FormKC).ToLowerInvariant();
        var sb = new StringBuilder(lowered.Length);
        foreach (var ch in lowered)
        {
            if (Homoglyphs.TryGetValue(ch, out var h)) sb.Append(h);
            else if (Leet.TryGetValue(ch, out var l)) sb.Append(l);
            else sb.Append(ch);
        }

        var folded = sb.ToString();
        folded = Separators.Replace(folded, "");
        folded = Repeats.Replace(folded, "$1");
        return folded;
    }
}
