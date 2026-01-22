using Discord;
using Discord.Interactions;
using Discord.WebSocket;
using DuneBot.Data;
using DuneBot.Data.Repositories;
using DuneBot.Domain.Interfaces;
using DuneBot.Engine.Services;
using DuneBot.Host.Modules;
using DuneBot.Host.Services;
using DuneBot.Renderer;
using Microsoft.EntityFrameworkCore;

namespace DuneBot.Host;

public class Worker : BackgroundService
{
    private readonly ILogger<Worker> _logger;
    private readonly DiscordSocketClient _client;
    private readonly InteractionService _interactionService;
    private readonly IConfiguration _configuration;
    private readonly IServiceProvider _serviceProvider;

    public Worker(ILogger<Worker> logger, DiscordSocketClient client, InteractionService interactionService, IConfiguration configuration, IServiceProvider serviceProvider)
    {
        _logger = logger;
        _client = client;
        _interactionService = interactionService;
        _configuration = configuration;
        _serviceProvider = serviceProvider;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // 1. Ensure DB Created
        using (var scope = _serviceProvider.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<DuneDbContext>();
            await db.Database.EnsureCreatedAsync(stoppingToken);
        }

        // 2. Setup Discord
        _client.Log += LogAsync;
        _interactionService.Log += LogAsync;

        // Discover and load modules (Critical Step: Without this, nothing gets registered!)
        await _interactionService.AddModulesAsync(typeof(Worker).Assembly, _serviceProvider);

        _client.Ready += async () =>
        {
            // Register modules
            try 
            {
                 // In prod, use RegisterCommandsToGuildAsync for immediate updates, or global for slow updates
                     await _interactionService.RegisterCommandsGloballyAsync();
                     _logger.LogInformation("Commands registered globally.");
            }
            catch(Exception ex)
            {
                _logger.LogError(ex, "Error registering commands");
            }
        };

        // Handle Interactions
        _client.InteractionCreated += async (x) =>
        {
            var ctx = new SocketInteractionContext(_client, x);
            await _interactionService.ExecuteCommandAsync(ctx, _serviceProvider);
        };

        // 3. Login and Start
        var token = _configuration["Discord:Token"];
        if (string.IsNullOrEmpty(token))
        {
            _logger.LogError("Discord Token is missing from configuration!");
            return;
        }

        await _client.LoginAsync(TokenType.Bot, token);
        await _client.StartAsync();

        await Task.Delay(-1, stoppingToken);
    }

    private Task LogAsync(LogMessage msg)
    {
        _logger.LogInformation(msg.ToString());
        return Task.CompletedTask;
    }
}
