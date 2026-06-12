namespace VSMatch.Services.Auth;

public interface IVkIdStateStore
{
    void Save(string state, string codeVerifier, string? inviteCode, DateTimeOffset expiresAt);
    bool TryGet(string state, out string codeVerifier, out string? inviteCode);
    void Remove(string state);
}
