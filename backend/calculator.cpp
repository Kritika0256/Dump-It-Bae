/*
 * ============================================================
 *  DumpIt Bae — Waste Calculator Engine (C++)
 *  OOP Version — Classes, Objects, Inheritance, Encapsulation
 * ============================================================
 */

#include <iostream>
#include <string>
#include <map>
#include <cmath>
#include <sstream>
#include <cstdlib>

using namespace std;


// ══════════════════════════════════════════════════════════════
// CLASS 1: WasteRates
// — Ek waste type ki CO2 rate aur points store karta hai
// — Encapsulation: private data, public getter methods
// ══════════════════════════════════════════════════════════════
class WasteRates {
private:
    double co2_per_kg;     // private — bahar se direct access nahi
    int    points_per_kg;  // private — getter se access karo

public:
    // Constructor — object banate waqt values set karo
    WasteRates(double co2, int pts) {
        co2_per_kg    = co2;
        points_per_kg = pts;
    }

    // Default constructor
    WasteRates() {
        co2_per_kg    = 0.0;
        points_per_kg = 0;
    }

    // Getter methods — encapsulation ka example
    double getCO2Rate()    const { return co2_per_kg; }
    int    getPointsRate() const { return points_per_kg; }
};


// ══════════════════════════════════════════════════════════════
// CLASS 2: WasteInput
// — User ka input store karta hai
// — Encapsulation + Validation andar hi hoti hai
// ══════════════════════════════════════════════════════════════
class WasteInput {
private:
    double wet_kg;
    double dry_kg;
    double bulk_kg;
    double ewaste_kg;
    int    household_size;
    string frequency;

public:
    // Constructor with validation
    WasteInput(double wet, double dry, double bulk,
               double ewaste, int size, string freq) {
        wet_kg         = (wet    >= 0) ? wet    : 0;
        dry_kg         = (dry    >= 0) ? dry    : 0;
        bulk_kg        = (bulk   >= 0) ? bulk   : 0;
        ewaste_kg      = (ewaste >= 0) ? ewaste : 0;
        household_size = (size   >= 1) ? size   : 1;
        frequency      = freq;
    }

    // Getter methods
    double getWet()           const { return wet_kg; }
    double getDry()           const { return dry_kg; }
    double getBulk()          const { return bulk_kg; }
    double getEwaste()        const { return ewaste_kg; }
    int    getHouseholdSize() const { return household_size; }
    string getFrequency()     const { return frequency; }

    double getTotalWaste() const {
        return wet_kg + dry_kg + bulk_kg + ewaste_kg;
    }
};


// ══════════════════════════════════════════════════════════════
// CLASS 3: CalculatorResult
// — Output store karta hai
// ══════════════════════════════════════════════════════════════
class CalculatorResult {
private:
    double total_daily_kg;
    double co2_saved_monthly;
    int    monthly_gift_points;
    string recommended_plan;

public:
    CalculatorResult() {
        total_daily_kg      = 0;
        co2_saved_monthly   = 0;
        monthly_gift_points = 0;
        recommended_plan    = "monthly";
    }

    void setTotalDaily(double val)      { total_daily_kg      = val; }
    void setCO2Monthly(double val)      { co2_saved_monthly   = val; }
    void setMonthlyPoints(int val)      { monthly_gift_points = val; }
    void setRecommendedPlan(string val) { recommended_plan    = val; }

    double getTotalDaily()      const { return total_daily_kg; }
    double getCO2Monthly()      const { return co2_saved_monthly; }
    int    getMonthlyPoints()   const { return monthly_gift_points; }
    string getRecommendedPlan() const { return recommended_plan; }
};


// ══════════════════════════════════════════════════════════════
// BASE CLASS 4: BaseCalculator
// — Abstract base class — sirf blueprint
// — Inheritance ka base
// ══════════════════════════════════════════════════════════════
class BaseCalculator {
protected:
    map<string, WasteRates> wasteRates;
    map<string, double>     freqMultiplier;
    map<int, double>        sizeMultiplier;

public:
    BaseCalculator() {
        wasteRates["wet"]    = WasteRates(0.5, 10);
        wasteRates["dry"]    = WasteRates(0.8, 25);
        wasteRates["bulk"]   = WasteRates(0.3,  8);
        wasteRates["ewaste"] = WasteRates(2.0, 50);

        freqMultiplier["daily"]     = 1.0;
        freqMultiplier["alternate"] = 0.5;
        freqMultiplier["weekly"]    = 1.0 / 7;

        sizeMultiplier[1] = 1.0;
        sizeMultiplier[2] = 1.6;
        sizeMultiplier[3] = 2.2;
        sizeMultiplier[4] = 3.0;
    }

    // Pure virtual — Polymorphism ka base
    virtual CalculatorResult calculate(WasteInput input) = 0;
    virtual ~BaseCalculator() {}

protected:
    double getFreqMultiplier(string freq) {
        return freqMultiplier.count(freq) ? freqMultiplier[freq] : 1.0;
    }
    double getSizeMultiplier(int size) {
        return sizeMultiplier.count(size) ? sizeMultiplier[size] : 1.0;
    }
};


// ══════════════════════════════════════════════════════════════
// DERIVED CLASS 5: WasteCalculator
// — BaseCalculator se inherit karta hai
// — calculate() override karta hai — Runtime Polymorphism!
// ══════════════════════════════════════════════════════════════
class WasteCalculator : public BaseCalculator {
public:
    WasteCalculator() : BaseCalculator() {}

    CalculatorResult calculate(WasteInput input) override {
        CalculatorResult result;

        double freq = getFreqMultiplier(input.getFrequency());
        double size = getSizeMultiplier(input.getHouseholdSize());

        double total = input.getTotalWaste() * size * freq;
        result.setTotalDaily(round(total * 100.0) / 100.0);

        double co2_daily = (
            input.getWet()    * wasteRates["wet"].getCO2Rate()    +
            input.getDry()    * wasteRates["dry"].getCO2Rate()    +
            input.getBulk()   * wasteRates["bulk"].getCO2Rate()   +
            input.getEwaste() * wasteRates["ewaste"].getCO2Rate()
        ) * size * freq;

        result.setCO2Monthly(round(co2_daily * 30.0 * 100.0) / 100.0);

        double pts_daily = (
            input.getWet()    * wasteRates["wet"].getPointsRate()    +
            input.getDry()    * wasteRates["dry"].getPointsRate()    +
            input.getBulk()   * wasteRates["bulk"].getPointsRate()   +
            input.getEwaste() * wasteRates["ewaste"].getPointsRate()
        ) * size * freq;

        result.setMonthlyPoints((int)round(pts_daily * 30.0));
        result.setRecommendedPlan(recommendPlan(total));

        return result;
    }

private:
    string recommendPlan(double daily_kg) {
        if      (daily_kg < 0.5)  return "15day";
        else if (daily_kg >= 1.5) return "quarterly";
        else                      return "monthly";
    }
};


// ══════════════════════════════════════════════════════════════
// MAIN FUNCTION
// ══════════════════════════════════════════════════════════════
int main(int argc, char* argv[]) {
    if (argc < 6) {
        cout << "{\"error\":\"Usage: calculator wet dry bulk ewaste size freq\"}" << endl;
        return 1;
    }

    // WasteInput object — constructor validation karega
    WasteInput input(
        atof(argv[1]),
        atof(argv[2]),
        atof(argv[3]),
        atof(argv[4]),
        atoi(argv[5]),
        (argc > 6) ? string(argv[6]) : "daily"
    );

    // WasteCalculator object — BaseCalculator se inherit kiya
    WasteCalculator calculator;

    // calculate() — polymorphism in action!
    CalculatorResult result = calculator.calculate(input);

    cout << "{"
         << "\"total_daily_kg\":"      << result.getTotalDaily()      << ","
         << "\"co2_saved_monthly\":"   << result.getCO2Monthly()      << ","
         << "\"monthly_gift_points\":" << result.getMonthlyPoints()   << ","
         << "\"recommended_plan\":\""  << result.getRecommendedPlan() << "\","
         << "\"breakdown\":{"
             << "\"wet\":"    << input.getWet()    << ","
             << "\"dry\":"    << input.getDry()    << ","
             << "\"bulk\":"   << input.getBulk()   << ","
             << "\"ewaste\":" << input.getEwaste()
         << "}}"
         << endl;

    return 0;
}
