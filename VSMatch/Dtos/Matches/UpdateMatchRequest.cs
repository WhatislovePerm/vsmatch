using System.ComponentModel.DataAnnotations;
using VSMatch.Data.Entities;

namespace VSMatch.Dtos.Matches;

public record UpdateMatchRequest(
    [Required]
    Guid CourtId,
    [Required, MinLength(1), MaxLength(256)]
    string Title,
    [MaxLength(1024)]
    string? Description,
    [MaxLength(64)]
    string? TeamAName,
    [MaxLength(64)]
    string? TeamBName,
    DateTime StartsAtUtc,
    [Range(15, 240)]
    int DurationMinutes,
    [Range(2, 50)]
    int MaxPlayers,
    MatchStatus Status
);
