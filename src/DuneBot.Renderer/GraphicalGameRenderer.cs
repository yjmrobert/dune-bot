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
    private BoardLayout? _layout;

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

        // 3. Draw Spice Blows
        var spiceTokenPath = Path.Combine(_addsetsPath, "token_spice.png");
        if (File.Exists(spiceTokenPath) && _layout != null)
        {
            using var spiceToken = Image.Load(spiceTokenPath);
            // ... font loading ...
            Font font;
            try { font = SystemFonts.CreateFont("Arial", 40, FontStyle.Bold); }
            catch {  
                 var collection = new FontCollection();
                 var family = collection.Add(Path.Combine(_addsetsPath, "font.ttf"));
                 font = family.CreateFont(40, FontStyle.Bold);
            }

            foreach (var t in state.Map.Territories.Where(t => t.SpiceBlowAmount > 0))
            {
                var layoutItem = _layout.Territories.FirstOrDefault(l => l.Name.Equals(t.Name, StringComparison.OrdinalIgnoreCase));
                if (layoutItem != null)
                {
                    var x = layoutItem.SpiceCoords.X - (spiceToken.Width / 2);
                    var y = layoutItem.SpiceCoords.Y - (spiceToken.Height / 2);
                    
                    var location = new SixLabors.ImageSharp.Point(x, y);
                    image.Mutate(ctx => ctx.DrawImage(spiceToken, location, 1f));

                    // Render Number
                    string text = t.SpiceBlowAmount.ToString();
                    
                    // Measure (Estimation)
                    float estimatedWidth = text.Length * (font.Size * 0.6f); 
                    float estimatedHeight = font.Size;
                    
                    float textX = x + spiceToken.Width - estimatedWidth - 10;
                    float textY = y + spiceToken.Height - estimatedHeight - 10;
                    var textLocation = new PointF(textX, textY);

                    var brush = Brushes.Solid(Color.White);
                    var pen = Pens.Solid(Color.Black, 4f);
                    
                    image.Mutate(ctx => ctx.DrawText(text, font, brush, pen, textLocation));
                }
            }
        }
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
    public string Name { get; set; } = string.Empty;
    public Point SpiceCoords { get; set; } = new();
    public List<Point> ForceSlots { get; set; } = new();
}

public class Point
{
    public int X { get; set; }
    public int Y { get; set; }
}
