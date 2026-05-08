using VSMatch.Dtos.Matches;
using VSMatch.Domain;

namespace VSMatch.Domain.Matches;

public static class MatchValidationRules
{
    public static void Validate(CreateMatchRequest req)
        => Validate(req.Title, req.DurationMinutes, req.MaxPlayers, req.TeamAName, req.TeamBName);

    public static void Validate(UpdateMatchRequest req)
        => Validate(req.Title, req.DurationMinutes, req.MaxPlayers, req.TeamAName, req.TeamBName);

    public static string NormalizeTeamName(string? value, string fallback)
    {
        var name = value?.Trim();
        if (string.IsNullOrWhiteSpace(name))
            return fallback;
        if (name.Length > 64)
            throw new ValidationException("Team name must be 64 characters or less.");

        return name;
    }

    private static void Validate(string title, int durationMinutes, int maxPlayers, string? teamAName, string? teamBName)
    {
        if (string.IsNullOrWhiteSpace(title))
            throw new ValidationException("Title is required.");
        if (durationMinutes < 15 || durationMinutes > 240)
            throw new ValidationException("Duration must be between 15 and 240 minutes.");
        if (maxPlayers < 2 || maxPlayers > 50)
            throw new ValidationException("Max players must be between 2 and 50.");

        _ = NormalizeTeamName(teamAName, "Команда A");
        _ = NormalizeTeamName(teamBName, "Команда B");
    }
}
