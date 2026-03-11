/*
 * ============================================================
 *  DumpIt Bae — Waste Calculator Engine (C++)
 *  Reads JSON-like args from command line, outputs JSON result
 * ============================================================
 */

#include <iostream>
#include <string>
#include <map>
#include <cmath>
#include <sstream>
#include <cstdlib>

using namespace std;

// ── Data structures (C++ structs) ────────────────────────────
struct WasteRates {
    double co2_per_kg;   // kg of CO2 saved per kg waste
    int    points_per_kg; // gift points per kg
};

struct CalculatorInput {
    double wet_kg    = 0;
    double dry_kg    = 0;
    double bulk_kg   = 0;
    double ewaste_kg = 0;
    int    household_size = 1;
    string frequency = "daily";
};

struct CalculatorOutput {
    double total_daily_kg;
    double co2_saved_monthly;
    int    monthly_gift_points;
    string recommended_plan;
};

// ── Lookup tables (like C++ maps/arrays) ─────────────────────
map<string, WasteRates> WASTE_RATES = {
    { "wet",    { 0.5,  10  } },
    { "dry",    { 0.8,  25  } },
    { "bulk",   { 0.3,  8   } },
    { "ewaste", { 2.0,  50  } }
};

map<string, double> FREQ_MULTIPLIER = {
    { "daily",     1.0   },
    { "alternate", 0.5   },
    { "weekly",    1.0/7 }
};

map<int, double> SIZE_MULTIPLIER = {
    { 1, 1.0 },
    { 2, 1.6 },
    { 3, 2.2 },
    { 4, 3.0 }
};

// ── Core calculation function ─────────────────────────────────
CalculatorOutput calculate(CalculatorInput input) {
    CalculatorOutput output;

    double freq = FREQ_MULTIPLIER.count(input.frequency)
                  ? FREQ_MULTIPLIER[input.frequency] : 1.0;
    double size = SIZE_MULTIPLIER.count(input.household_size)
                  ? SIZE_MULTIPLIER[input.household_size] : 1.0;

    // Total daily waste
    double total = (input.wet_kg + input.dry_kg +
                    input.bulk_kg + input.ewaste_kg) * size * freq;
    output.total_daily_kg = round(total * 100.0) / 100.0;

    // CO2 saved per day
    double co2_daily = (
        input.wet_kg    * WASTE_RATES["wet"].co2_per_kg +
        input.dry_kg    * WASTE_RATES["dry"].co2_per_kg +
        input.bulk_kg   * WASTE_RATES["bulk"].co2_per_kg +
        input.ewaste_kg * WASTE_RATES["ewaste"].co2_per_kg
    ) * size * freq;

    output.co2_saved_monthly = round(co2_daily * 30.0 * 100.0) / 100.0;

    // Monthly gift points
    double pts_daily = (
        input.wet_kg    * WASTE_RATES["wet"].points_per_kg +
        input.dry_kg    * WASTE_RATES["dry"].points_per_kg +
        input.bulk_kg   * WASTE_RATES["bulk"].points_per_kg +
        input.ewaste_kg * WASTE_RATES["ewaste"].points_per_kg
    ) * size * freq;

    output.monthly_gift_points = (int)round(pts_daily * 30.0);

    // Plan recommendation (decision tree)
    if      (total < 0.5)  output.recommended_plan = "15day";
    else if (total >= 1.5) output.recommended_plan = "quarterly";
    else                   output.recommended_plan = "monthly";

    return output;
}

// ── Main: read args, compute, print JSON ─────────────────────
int main(int argc, char* argv[]) {
    if (argc < 6) {
        cout << "{\"error\":\"Usage: calculator wet dry bulk ewaste household_size frequency\"}" << endl;
        return 1;
    }

    CalculatorInput input;
    input.wet_kg         = atof(argv[1]);
    input.dry_kg         = atof(argv[2]);
    input.bulk_kg        = atof(argv[3]);
    input.ewaste_kg      = atof(argv[4]);
    input.household_size = atoi(argv[5]);
    input.frequency      = (argc > 6) ? string(argv[6]) : "daily";

    CalculatorOutput result = calculate(input);

    // Output JSON
    cout << "{"
         << "\"total_daily_kg\":"        << result.total_daily_kg        << ","
         << "\"co2_saved_monthly\":"     << result.co2_saved_monthly     << ","
         << "\"monthly_gift_points\":"   << result.monthly_gift_points   << ","
         << "\"recommended_plan\":\""    << result.recommended_plan      << "\","
         << "\"breakdown\":{"
             << "\"wet\":"     << input.wet_kg    << ","
             << "\"dry\":"     << input.dry_kg    << ","
             << "\"bulk\":"    << input.bulk_kg   << ","
             << "\"ewaste\":"  << input.ewaste_kg
         << "}}"
         << endl;

    return 0;
}
