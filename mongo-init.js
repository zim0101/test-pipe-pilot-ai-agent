db = db.getSiblingDB('solarSystem');

db.createUser({
    user: 'admin',
    pwd: 'password',
    roles: [{ role: 'readWrite', db: 'solarSystem' }]
});

db.planets.drop();

db.planets.insertMany([
    {
        id: 0,
        name: "Sun",
        description: "The Sun is the star at the center of the Solar System.",
        image: "images/sun.png",
        velocity: "N/A",
        distance: "0"
    },
    {
        id: 1,
        name: "Mercury",
        description: "Mercury is the smallest and innermost planet in the Solar System.",
        image: "images/mercury.png",
        velocity: "47.87 km/s",
        distance: "57.91 million km"
    },
    {
        id: 2,
        name: "Venus",
        description: "Venus is the second planet from the Sun and is Earth's closest planetary neighbor.",
        image: "images/venus.png",
        velocity: "35.02 km/s",
        distance: "108.2 million km"
    },
    {
        id: 3,
        name: "Earth",
        description: "Earth is the third planet from the Sun and the only astronomical object known to harbor life.",
        image: "images/earth.png",
        velocity: "29.78 km/s",
        distance: "149.6 million km"
    },
    {
        id: 4,
        name: "Mars",
        description: "Mars is the fourth planet from the Sun and the second-smallest planet in the Solar System.",
        image: "images/mars.png",
        velocity: "24.13 km/s",
        distance: "227.9 million km"
    },
    {
        id: 5,
        name: "Jupiter",
        description: "Jupiter is the fifth planet from the Sun and the largest in the Solar System.",
        image: "images/jupiter.png",
        velocity: "13.07 km/s",
        distance: "778.5 million km"
    },
    {
        id: 6,
        name: "Saturn",
        description: "Saturn is the sixth planet from the Sun and the second-largest in the Solar System.",
        image: "images/saturn.png",
        velocity: "9.69 km/s",
        distance: "1.434 billion km"
    },
    {
        id: 7,
        name: "Uranus",
        description: "Uranus is the seventh planet from the Sun and has the third-largest diameter in our solar system.",
        image: "images/uranus.png",
        velocity: "6.81 km/s",
        distance: "2.871 billion km"
    },
    {
        id: 8,
        name: "Neptune",
        description: "Neptune is the eighth and farthest-known Solar planet from the Sun.",
        image: "images/neptune.png",
        velocity: "5.43 km/s",
        distance: "4.495 billion km"
    },
    {
        id: 9,
        name: "Pluto",
        description: "Pluto is a dwarf planet in the Kuiper belt, a ring of bodies beyond the orbit of Neptune.",
        image: "images/pluto.png",
        velocity: "4.74 km/s",
        distance: "5.9 billion km"
    }
]);

print("Planet data initialization complete!");