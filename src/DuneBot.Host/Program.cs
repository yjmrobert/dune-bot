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
using Microsoft.EntityFrameworkCore;

var builder = Host.CreateApplicationBuilder(args);

// Configuration
builder.Services.AddDbContext<DuneDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection") ?? "Data Source=dune.db"));

// Discord
builder.Services.AddSingleton<DiscordSocketClient>();
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

// Hosted Service
builder.Services.AddHostedService<Worker>();

var host = builder.Build();
host.Run();
