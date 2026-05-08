using System.ComponentModel.DataAnnotations;

namespace VSMatch.Dtos.Auth;

public record UpdateProfileRequest([Required, MinLength(1), MaxLength(64)] string DisplayName);
