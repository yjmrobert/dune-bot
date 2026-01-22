using System;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Collections.Generic;
using DuneBot.Domain.Interfaces;
using DuneBot.Domain.State;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;
using SixLabors.ImageSharp.PixelFormats;
using SixLabors.ImageSharp.Drawing.Processing;
using SixLabors.Fonts;

namespace DuneBot.Renderer;

public class GraphicalGameRenderer : IGameRenderer
{
    private readonly string _addsetsPath;
    private BoardLayout _layout;

    public GraphicalGameRenderer()
    {
        // Assume assets are in "Assets" folder relative to execution
        _addsetsPath = Path.Combine(AppContext.BaseDirectory, "Assets");
        LoadLayout();
    }

    private void LoadLayout()
    {
        var layoutPath = Path.Combine(_addsetsPath, "board_layout.json");
        if (File.Exists(layoutPath))
        {
            try
            {
                var json = File.ReadAllText(layoutPath);
                var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                _layout = JsonSerializer.Deserialize<BoardLayout>(json, options);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[Error] Failed to load board layout: {ex.Message}");
            }
        }
        else
        {
            Console.WriteLine($"[Warning] Layout file not found at {layoutPath}");
        }
    }

    public string Render(GameState state)
    {
        // 1. Load Base Map
        var basePath = Path.Combine(_addsetsPath, "board_base.png");
        if (!File.Exists(basePath))
        {
            return "Error: board_base.png not found.";
        }

        using var image = Image.Load(basePath);

        // 2. Load and Draw Storm
        // Storm logic: user provided 18 overlays named storm_01.png ... storm_18.png
        // State.StormLocation is 1-18.
        var stormFile = $"storm_{state.StormLocation:D2}.png";
        var stormPath = Path.Combine(_addsetsPath, stormFile);

        if (File.Exists(stormPath))
        {
            using var stormOverlay = Image.Load(stormPath);
            // Draw storm over base (assumed same size, 0,0)
            image.Mutate(x => x.DrawImage(stormOverlay, 1f));
        }
        else
        {
            Console.WriteLine($"[Warning] Storm overlay {stormFile} not found.");
        }

        // 3. Draw Spice Blows (Future Step)
        // 4. Draw Forces (Future Step)

        // 5. Resize if too large (Max Width 1920)
        if (image.Width > 1920)
        {
            image.Mutate(x => x.Resize(new ResizeOptions
            {
                Size = new Size(1920, 0), // 0 maintains aspect ratio
                Mode = ResizeMode.Max
            }));
        }

        // 6. Save functionality (JPEG for compression)
        var outputPath = Path.Combine(AppContext.BaseDirectory, "temp_map.jpg");
        image.SaveAsJpeg(outputPath);

        return outputPath;
    }
}

// Layout DTOs
public class BoardLayout
{
    public int Width { get; set; }
    public int Height { get; set; }
    public List<TerritoryLayout> Territories { get; set; } = new();
}

public class TerritoryLayout
{
    public string Name { get; set; }
    public Point SpiceCoords { get; set; }
    public List<Point> ForceSlots { get; set; } = new();
}

public class Point
{
    public int X { get; set; }
    public int Y { get; set; }
}
