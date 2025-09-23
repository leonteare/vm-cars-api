import express from "express";
import fs from "fs";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3000;

// Allow JSON body for POST requests
app.use(express.json());

// Path to persistent file
const carsFile = "/mnt/data/cars.json";

// Serve cars.json if it exists
app.get("/cars.json", (req, res) => {
  if (fs.existsSync(carsFile)) {
    res.sendFile(carsFile);
  } else {
    res.status(404).json({ error: "cars.json not found" });
  }
});

// Endpoint for n8n to update cars.json
app.post("/update", (req, res) => {
  try {
    fs.writeFileSync(carsFile, JSON.stringify(req.body, null, 2));
    res.json({ status: "✅ cars.json updated", items: req.body.cms?.length || 0 });
  } catch (err) {
    console.error("Error writing cars.json:", err);
    res.status(500).json({ error: "Failed to update cars.json" });
  }
});

// Health check
app.get("/", (req, res) => {
  res.send("✅ Cars API running");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
