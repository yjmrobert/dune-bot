using System.Collections.Generic;
using DuneBot.Domain.Interfaces;
using DuneBot.Domain.State;

namespace DuneBot.Engine.Services;

public class MapService : IMapService
{
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
        
        // Note: This is an abbreviated map for MVP. 
        // Full adjacency graph would be needed for Move validation.
        // For now, we just listing territories so Storm can kill things.
        
        return map;
    }

    public int CalculateNextStormSector(int currentSector, int moveAmount)
    {
        // Sectors are 1-18.
        // Moves Counter-Clockwise (increasing sector number?)
        // Wait, standard board is numbered counter-clockwise usually.
        // Let's assume Sector 1 -> 2 -> ... -> 18 -> 1
        
        var next = (currentSector + moveAmount);
        if (next > 18) next -= 18;
        return next;
    }
}
