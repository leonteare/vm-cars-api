import express from "express";
import fs from "fs";
import path from "path";

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

// Path to cars.json
const carsFile = path.join(process.cwd(), "cars.json");

// --- GET cars ---
app.get("/cars", (req, res) => {
  try {
    if (!fs.existsSync(carsFile)) {
      return res.json([]);
    }
    const data = fs.readFileSync(carsFile, "utf8");
    res.json(JSON.parse(data));
  } catch (err) {
    console.error("Error reading cars.json:", err);
    res.status(500).json({ error: "Failed to read cars.json" });
  }
});

// --- POST update ---
app.post("/update", (req, res) => {
  try {
    // Accept flexible input
    const body = req.body;
    let cars = [];

    if (Array.isArray(body)) {
      cars = body;
    } else if (Array.isArray(body.cms)) {
      cars = body.cms;
    } else if (Array.isArray(body.cars)) {
      cars = body.cars;
    } else {
      return res
        .status(400)
        .json({ error: "Invalid format: expected an array, or {cms: []}, or {cars: []}" });
    }

    fs.writeFileSync(carsFile, JSON.stringify(cars, null, 2));

    res.json({
      status: "✅ cars.json updated",
      count: cars.length,
    });
  } catch (err) {
    console.error("Error writing cars.json:", err);
    res.status(500).json({ error: "Failed to update cars.json" });
  }
});

// --- Root endpoint ---
app.get("/", (req, res) => {
  res.send("🚗 Cars API is running");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
