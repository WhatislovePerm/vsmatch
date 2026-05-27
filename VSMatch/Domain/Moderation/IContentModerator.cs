namespace VSMatch.Domain.Moderation;

public interface IContentModerator
{
    void EnsureClean(string? value, string fieldName);
}
