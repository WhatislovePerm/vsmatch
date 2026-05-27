using System.Collections.Concurrent;
using System.Runtime.CompilerServices;
using System.Threading.Channels;

namespace VSMatch.Services.Matches;

public class InMemoryMatchEventHub : IMatchEventHub
{
    private readonly ConcurrentDictionary<Guid, Channel<string>> _subscribers = new();

    public Task PublishChangedAsync(CancellationToken ct = default)
    {
        foreach (var pair in _subscribers)
            pair.Value.Writer.TryWrite("matches-changed");

        return Task.CompletedTask;
    }

    public async IAsyncEnumerable<string> SubscribeAsync([EnumeratorCancellation] CancellationToken ct = default)
    {
        var id = Guid.NewGuid();
        var channel = Channel.CreateUnbounded<string>();
        _subscribers[id] = channel;

        try
        {
            yield return "connected";

            await foreach (var message in channel.Reader.ReadAllAsync(ct))
                yield return message;
        }
        finally
        {
            _subscribers.TryRemove(id, out _);
        }
    }
}
