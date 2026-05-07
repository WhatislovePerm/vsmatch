namespace VSMatch.Services.Matches;

public interface IMatchEventHub
{
    Task PublishChangedAsync(CancellationToken ct = default);
    IAsyncEnumerable<string> SubscribeAsync(CancellationToken ct = default);
}
