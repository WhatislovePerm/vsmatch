namespace VSMatch.Services.Auth;

public interface IVkIdStateStore
{
    void Save(string state, string codeVerifier, DateTimeOffset expiresAt);
    bool TryGet(string state, out string codeVerifier);
    void Remove(string state);
}
