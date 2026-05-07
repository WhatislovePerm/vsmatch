namespace VSMatch.Dtos.Courts;

public record CourtDto(
    Guid Id,
    string Name,
    string? Description,
    double Lat,
    double Lon,
    string? Sport,
    string? Surface,
    double? Rating,
    bool IsFree
);
