using VSMatch.Domain.Moderation;
using VSMatch.Dtos.Matches;

namespace VSMatch.Domain.Matches;

public static class MatchValidationRules
{
    public static void Validate(CreateMatchRequest req, IContentModerator moderator)
        => Validate(req.Title, req.Description, req.TeamAName, req.TeamBName, req.DurationMinutes, req.MaxPlayers, moderator);

    public static void Validate(UpdateMatchRequest req, IContentModerator moderator)
        => Validate(req.Title, req.Description, req.TeamAName, req.TeamBName, req.DurationMinutes, req.MaxPlayers, moderator);

    public static string NormalizeTeamName(string? value, string fallback, IContentModerator moderator, string fieldName)
    {
        var name = value?.Trim();
        if (string.IsNullOrWhiteSpace(name))
            return fallback;
        if (name.Length > 64)
            throw new ValidationException("Team name must be 64 characters or less.");
        moderator.EnsureClean(name, fieldName);
        return name;
    }

    private static void Validate(
        string title,
        string? description,
        string? teamAName,
        string? teamBName,
        int durationMinutes,
        int maxPlayers,
        IContentModerator moderator)
    {
        if (string.IsNullOrWhiteSpace(title))
            throw new ValidationException("Title is required.");
        if (durationMinutes < 15 || durationMinutes > 240)
            throw new ValidationException("Duration must be between 15 and 240 minutes.");
        if (maxPlayers < 2 || maxPlayers > 50)
            throw new ValidationException("Max players must be between 2 and 50.");

        moderator.EnsureClean(title, "Название");
        moderator.EnsureClean(description, "Описание");
        _ = NormalizeTeamName(teamAName, "Команда A", moderator, "Команда 1");
        _ = NormalizeTeamName(teamBName, "Команда B", moderator, "Команда 2");
    }
}
