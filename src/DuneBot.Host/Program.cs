using Discord.Interactions;
using Discord.WebSocket;
using DuneBot.Data;
using DuneBot.Data.Repositories;
using DuneBot.Domain.Interfaces;
using DuneBot.Engine;
using DuneBot.Engine.Services;
using DuneBot.Host;
using DuneBot.Host.Services;
using DuneBot.Renderer;
using DuneBot.Engine.Phases; // Add this
using Microsoft.EntityFrameworkCore;

var builder = Host.CreateApplicationBuilder(args);

// Configuration
builder.Services.AddDbContext<DuneDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection") ?? "Data Source=dune.db"));

// Discord
builder.Services.AddSingleton<DiscordSocketClient>(sp => 
    new DiscordSocketClient(new DiscordSocketConfig 
    { 
        GatewayIntents = Discord.GatewayIntents.AllUnprivileged & ~Discord.GatewayIntents.GuildInvites & ~Discord.GatewayIntents.GuildScheduledEvents 
    }));
builder.Services.AddSingleton(x => new InteractionService(x.GetRequiredService<DiscordSocketClient>()));

// Services
builder.Services.AddScoped<IGameRepository, GameRepository>();
builder.Services.AddScoped<IGameRenderer, GraphicalGameRenderer>();
builder.Services.AddScoped<IDiscordService, DiscordService>();
builder.Services.AddScoped<GameManager>();
builder.Services.AddScoped<GameManager>();
builder.Services.AddScoped<GameEngine>();
builder.Services.AddSingleton<IMapService, MapService>();
builder.Services.AddSingleton<IDeckService, DeckService>();
builder.Services.AddScoped<IBattleService, BattleService>();
builder.Services.AddScoped<IBiddingService, BiddingService>();
builder.Services.AddScoped<IMovementService, MovementService>();
builder.Services.AddScoped<IRevivalService, RevivalService>();
builder.Services.AddScoped<IGameSetupService, GameSetupService>();
builder.Services.AddScoped<IGameMessageService, GameMessageService>();
builder.Services.AddScoped<ISpiceService, SpiceService>();
builder.Services.AddScoped<IPhaseManager, PhaseManager>();

// Phase Handlers
builder.Services.AddScoped<IGamePhaseHandler, SetupPhaseHandler>();
builder.Services.AddScoped<IGamePhaseHandler, StormPhaseHandler>();
builder.Services.AddScoped<IGamePhaseHandler, SpiceBlowPhaseHandler>();
builder.Services.AddScoped<IGamePhaseHandler, NexusPhaseHandler>();
builder.Services.AddScoped<IGamePhaseHandler, ChoamCharityPhaseHandler>();
builder.Services.AddScoped<IGamePhaseHandler, BiddingPhaseHandler>();
builder.Services.AddScoped<IGamePhaseHandler, RevivalPhaseHandler>();
builder.Services.AddScoped<IGamePhaseHandler, ShipmentPhaseHandler>();
builder.Services.AddScoped<IGamePhaseHandler, BattlePhaseHandler>();
builder.Services.AddScoped<IGamePhaseHandler, SpiceCollectionPhaseHandler>();
builder.Services.AddScoped<IGamePhaseHandler, MentatPausePhaseHandler>();

// Hosted Service
builder.Services.AddHostedService<Worker>();

var host = builder.Build();
host.Run();
