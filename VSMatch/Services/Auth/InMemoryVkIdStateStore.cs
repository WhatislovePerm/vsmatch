using System.Collections.Concurrent;

namespace VSMatch.Services.Auth;

public class InMemoryVkIdStateStore : IVkIdStateStore
{
    private readonly ConcurrentDictionary<string, (string Verifier, string? Invite, DateTimeOffset ExpiresAt)> _store = new();

    public void Save(string state, string codeVerifier, string? inviteCode, DateTimeOffset expiresAt)
        => _store[state] = (codeVerifier, inviteCode, expiresAt);

    public bool TryGet(string state, out string codeVerifier, out string? inviteCode)
    {
        if (_store.TryGetValue(state, out var entry) && entry.ExpiresAt > DateTimeOffset.UtcNow)
        {
            codeVerifier = entry.Verifier;
            inviteCode = entry.Invite;
            return true;
        }
        codeVerifier = string.Empty;
        inviteCode = null;
        return false;
    }

    public void Remove(string state) => _store.TryRemove(state, out _);
}
