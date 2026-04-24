using System.Collections.Concurrent;

namespace VSMatch.Services.Auth;

public class InMemoryVkIdStateStore : IVkIdStateStore
{
    private readonly ConcurrentDictionary<string, (string Verifier, DateTimeOffset ExpiresAt)> _store = new();

    public void Save(string state, string codeVerifier, DateTimeOffset expiresAt)
        => _store[state] = (codeVerifier, expiresAt);

    public bool TryGet(string state, out string codeVerifier)
    {
        if (_store.TryGetValue(state, out var entry) && entry.ExpiresAt > DateTimeOffset.UtcNow)
        {
            codeVerifier = entry.Verifier;
            return true;
        }
        codeVerifier = string.Empty;
        return false;
    }

    public void Remove(string state) => _store.TryRemove(state, out _);
}
