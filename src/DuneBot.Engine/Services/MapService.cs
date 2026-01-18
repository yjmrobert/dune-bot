using System.Collections.Generic;
using DuneBot.Domain.Interfaces;
using DuneBot.Domain.State;

namespace DuneBot.Engine.Services;

public class MapService : IMapService
{
    private readonly Dictionary<string, List<string>> _adjacency = new();

    public MapService()
    {
        // Define Adjacency Graph (MVP Subset + Logical connections)
        Connect("Sietch Tabr", "Shield Wall (S1)");
        Connect("Sietch Tabr", "Cliffs (S1)");
        Connect("Shield Wall (S1)", "Imperial Basin (S1)");
        Connect("Imperial Basin (S1)", "Imperial Basin (S2)"); // Cross-sector
        Connect("Imperial Basin (S2)", "Arrakeen");
        Connect("Arrakeen", "Imperial Basin (S3)");
        Connect("Arrakeen", "Old Gap");
        
        Connect("Carthag", "Plastic Basin");
        Connect("Carthag", "Hagga Basin (S2)"); // Cross-sector approximation
        Connect("Carthag", "Arsunt");
        
        Connect("Sietch Tuek", "Plastic Basin (S8)");
        Connect("Sietch Tuek", "Pasty Mesa");
        
        Connect("Habbanya Sietch", "Habbanya Erg");
        Connect("Habbanya Sietch", "Habbanya Ridge (S11)");
        
        // Add more logical connections for testing movement
        Connect("Cliffs (S1)", "Sietch Tabr"); // Redundant with bidirectional helper but good for clarity
    }

    private void Connect(string t1, string t2)
    {
        if (!_adjacency.ContainsKey(t1)) _adjacency[t1] = new List<string>();
        if (!_adjacency.ContainsKey(t2)) _adjacency[t2] = new List<string>();
        
        if (!_adjacency[t1].Contains(t2)) _adjacency[t1].Add(t2);
        if (!_adjacency[t2].Contains(t1)) _adjacency[t2].Add(t1);
    }

    public bool AreTerritoriesAdjacent(string t1, string t2)
    {
        if (t1 == t2) return true; // Same territory is technically "reachable" distance 0
        if (_adjacency.ContainsKey(t1) && _adjacency[t1].Contains(t2)) return true;
        return false;
    }
    
    // BFS for checking distance (e.g., max 3 moves)
    public bool IsReachable(string start, string end, int maxMoves)
    {
        if (start == end) return true;
        
        var visited = new HashSet<string>();
        var queue = new Queue<(string, int)>();
        
        queue.Enqueue((start, 0));
        visited.Add(start);
        
        while (queue.Count > 0)
        {
            var (current, depth) = queue.Dequeue();
            if (depth >= maxMoves) continue;
            
            if (_adjacency.ContainsKey(current))
            {
                foreach (var neighbor in _adjacency[current])
                {
                    if (neighbor == end) return true;
                    if (!visited.Contains(neighbor))
                    {
                        visited.Add(neighbor);
                        queue.Enqueue((neighbor, depth + 1));
                    }
                }
            }
        }
        return false;
    }

    public MapState InitializeMap()
    {
        var map = new MapState();
        int idCounter = 1;

        // Helper to add territory
        void Add(string name, int sector, bool isStronghold = false, bool isSietch = false, int spice = 0)
        {
            map.Territories.Add(new Territory
            {
                Id = idCounter++,
                Name = name,
                Sector = sector,
                IsStronghold = isStronghold,
                IsSietch = isSietch,
                SpiceBlowAmount = spice
            });
        }

        // --- Sector 1 ---
        Add("Cliffs (S1)", 1);
        Add("Sietch Tabr", 1, isStronghold: true, isSietch: true); // Fremen Setup
        Add("Shield Wall (S1)", 1);
        Add("Imperial Basin (S1)", 1);

        // --- Sector 2 ---
        Add("Shield Wall (S2)", 2);
        Add("Imperial Basin (S2)", 2);
        Add("Hagga Basin (S2)", 2);

        // --- Sector 3 ---
        Add("Arrakeen", 3, isStronghold: true);
        Add("Imperial Basin (S3)", 3);
        Add("Old Gap", 3);

        // --- Sector 4 (Spice Blow: Broken Land) ---
        Add("Broken Land", 4); 
        Add("Tsimpo", 4);

        // --- Sector 5 ---
        Add("Plastic Basin", 5);
        Add("Carthag", 5, isStronghold: true);

        // --- Sector 6 ---
        Add("Arsunt", 6);
        Add("Hagga Basin (S6)", 6);

        // --- Sector 7 ---
        Add("Habbanya Ridge (S7)", 7);
        Add("Ergs (S7)", 7);

        // --- Sector 8 ---
        Add("Sietch Tuek", 8, isStronghold: true, isSietch: true); // Smuggler
        Add("Plastic Basin (S8)", 8);

        // --- Sector 9 ---
        Add("Red Chasm", 9); // Spice
        
        // --- Sector 10 ---
        Add("The Great Flat", 10); // Spice

        // --- Sector 11 ---
        Add("Habbanya Ridge (S11)", 11);

        // --- Sector 12 ---
        Add("Habbanya Erg", 12); // Spice
        Add("Habbanya Sietch", 12, isStronghold: true, isSietch: true);

        // --- Sector 13 ---
        Add("False Wall West", 13);

        // --- Sector 14 ---
        Add("Wind Pass", 14);

        // --- Sector 15 ---
        Add("The Minor Erg", 15); // Spice

        // --- Sector 16 ---
        Add("False Wall East", 16);

        // --- Sector 17 ---
        Add("Harg Pass", 17);

        // --- Sector 18 ---
        Add("Pasty Mesa", 18);
        Add("South Mesa", 18); // Spice
        
        return map;
    }

    public int CalculateNextStormSector(int currentSector, int moveAmount)
    {
        // Sectors are 1-18.
        var next = (currentSector + moveAmount);
        if (next > 18) next -= 18;
        return next;
    }
}
