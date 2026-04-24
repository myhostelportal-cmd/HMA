const bcrypt = require('bcryptjs');

// Mock Data Storage
const mockDB = {
  admins: [],
  owners: [],
  wardens: [],
  hostels: [],
  students: [],
  rooms: [],
  fees: [],
  expenses: [],
  complaints: [],
  activity_logs: []
};

// Initial Seed Data
const seedData = async () => {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('password123', salt);

  mockDB.admins.push({
    admin_id: 1,
    name: 'Danielle Garner',
    email: 'admin@info.com',
    password: hashedPassword,
    role: 'admin'
  });

  mockDB.owners.push({
    owner_id: 1,
    name: 'John Owner',
    email: 'owner@hostel.com',
    password: hashedPassword,
    role: 'owner'
  });

  mockDB.wardens.push({
    warden_id: 1,
    name: 'Warden Smith',
    email: 'warden@hostel.com',
    password: hashedPassword,
    role: 'warden'
  });
};

seedData();

module.exports = {
  query: async (text, params, callback) => {
    // Handle the case where params is omitted and second argument is the callback
    if (typeof params === 'function') {
      callback = params;
      params = [];
    }

    try {
      let result = { rows: [] };
      
      // Simple mock query handler
      if (text.includes('SELECT NOW()')) {
        result = { rows: [{ now: new Date() }] };
      } else if (text.includes('SELECT * FROM admins WHERE email = $1')) {
        const user = mockDB.admins.find(u => u.email === params[0]);
        result = { rows: user ? [user] : [] };
      } else if (text.includes('SELECT * FROM owners WHERE email = $1')) {
        const user = mockDB.owners.find(u => u.email === params[0]);
        result = { rows: user ? [user] : [] };
      } else if (text.includes('SELECT * FROM wardens WHERE email = $1')) {
        const user = mockDB.wardens.find(u => u.email === params[0]);
        result = { rows: user ? [user] : [] };
      } else if (text.includes('SELECT owner_id, name, email FROM owners')) {
        result = { rows: mockDB.owners.map(o => ({ owner_id: o.owner_id, name: o.name, email: o.email })) };
      } else if (text.includes('SELECT warden_id, name, email FROM wardens')) {
        result = { rows: mockDB.wardens.map(w => ({ warden_id: w.warden_id, name: w.name, email: w.email, phone: w.phone })) };
      } else if (text.includes('SELECT * FROM hostels')) {
        result = { rows: mockDB.hostels };
      } else if (text.includes('SELECT * FROM students')) {
        result = { rows: mockDB.students };
      } else if (text.includes('INSERT INTO owners')) {
        const emailExists = mockDB.admins.some(u => u.email === params[1]) || 
                            mockDB.owners.some(u => u.email === params[1]) || 
                            mockDB.wardens.some(u => u.email === params[1]);
        
        if (emailExists) {
          throw new Error('Email already exists in the system.');
        }

        const newOwner = { 
          owner_id: mockDB.owners.length + 1, 
          name: params[0], 
          email: params[1], 
          password: params[2], 
          phone: params[3],
          aadhaar: params[4],
          address: params[5],
          role: 'owner' 
        };
        mockDB.owners.push(newOwner);
        // Create associated log
        mockDB.activity_logs.push({
          user_role: 'admin',
          user_id: 1,
          action: `Created Owner: ${params[0]}`,
          module: 'owners',
          timestamp: new Date()
        });
        result = { rows: [newOwner] };
      } else if (text.includes('INSERT INTO wardens')) {
        const emailExists = mockDB.admins.some(u => u.email === params[1]) || 
                            mockDB.owners.some(u => u.email === params[1]) || 
                            mockDB.wardens.some(u => u.email === params[1]);
        
        if (emailExists) {
          throw new Error('Email already exists in the system.');
        }

        const newWarden = { warden_id: mockDB.wardens.length + 1, name: params[0], email: params[1], password: params[2], phone: params[3], role: 'warden' };
        mockDB.wardens.push(newWarden);
        // Create associated log
        mockDB.activity_logs.push({
          user_role: 'admin',
          user_id: 1,
          action: `Created Warden: ${params[0]}`,
          module: 'wardens',
          timestamp: new Date()
        });
        result = { rows: [newWarden] };
      } else if (text.includes('INSERT INTO hostels')) {
        const newHostel = { 
          hostel_id: mockDB.hostels.length + 1, 
          hostel_name: params[0], 
          address: params[1], 
          owner_id: params[2], 
          warden_id: params[3], 
          total_rooms: params[4],
          room_details: params[5] || [] // params[5] will be the tabular data
        };
        mockDB.hostels.push(newHostel);
        // Create associated log
        mockDB.activity_logs.push({
          user_role: 'admin',
          user_id: 1,
          action: `Created Hostel: ${params[0]}`,
          module: 'hostels',
          timestamp: new Date()
        });
        result = { rows: [newHostel] };
      } else if (text.includes('SELECT * FROM activity_logs')) {
        result = { rows: [...mockDB.activity_logs].sort((a, b) => b.timestamp - a.timestamp) };
      } else if (text.includes('SELECT COUNT(*) FROM hostels')) {
        result = { rows: [{ count: mockDB.hostels.length }] };
      } else if (text.includes('SELECT COUNT(*) FROM owners')) {
        result = { rows: [{ count: mockDB.owners.length }] };
      } else if (text.includes('SELECT COUNT(*) FROM wardens')) {
        result = { rows: [{ count: mockDB.wardens.length }] };
      } else if (text.includes('SELECT COUNT(*) FROM students')) {
        result = { rows: [{ count: mockDB.students.length }] };
      } else if (text.includes('SELECT * FROM hostels WHERE owner_id = $1')) {
        const hostels = mockDB.hostels.filter(h => h.owner_id == params[0]);
        result = { rows: hostels };
      } else if (text.includes('SELECT * FROM hostels WHERE warden_id = $1')) {
        const hostels = mockDB.hostels.filter(h => h.warden_id == params[0]);
        result = { rows: hostels };
      } else if (text.includes('SELECT * FROM hostels WHERE hostel_id = $1')) {
        const hostel = mockDB.hostels.find(h => h.hostel_id == params[0]);
        if (hostel) {
          const owner = mockDB.owners.find(o => o.owner_id == hostel.owner_id);
          const warden = mockDB.wardens.find(w => w.warden_id == hostel.warden_id);
          result = { rows: [{ 
            ...hostel, 
            owner_name: owner ? owner.name : 'Unknown Owner',
            warden_name: warden ? warden.name : 'Unknown Warden'
          }] };
        }
      } else if (text.includes('SELECT * FROM owners WHERE owner_id = $1')) {
        const owner = mockDB.owners.find(o => o.owner_id == params[0]);
        if (owner) {
          const hostels = mockDB.hostels.filter(h => h.owner_id == params[0]).map(h => {
            const warden = mockDB.wardens.find(w => w.warden_id == h.warden_id);
            return { ...h, warden_name: warden ? warden.name : 'Unknown Warden' };
          });
          result = { rows: [{ ...owner, hostels }] };
        }
      } else if (text.includes('SELECT * FROM wardens WHERE warden_id = $1')) {
        const warden = mockDB.wardens.find(w => w.warden_id == params[0]);
        if (warden) {
          const hostels = mockDB.hostels.filter(h => h.warden_id == params[0]).map(h => {
            const owner = mockDB.owners.find(o => o.owner_id == h.owner_id);
            return { ...h, owner_name: owner ? owner.name : 'Unknown Owner' };
          });
          result = { rows: [{ ...warden, hostels }] };
        }
      } else if (text.includes('SELECT total_rooms FROM hostels WHERE hostel_id = $1')) {
        const hostel = mockDB.hostels.find(h => h.hostel_id == params[0]);
        result = { rows: hostel ? [{ total_rooms: hostel.total_rooms }] : [] };
      } else if (text.includes('INSERT INTO rooms')) {
        const newRoom = {
          room_id: mockDB.rooms.length + 1,
          hostel_id: params[0],
          room_number: params[1],
          room_type: params[2],
          capacity: params[3],
          floor: params[4] || 'Ground Floor',
          status: 'available',
          students: []
        };
        mockDB.rooms.push(newRoom);
        result = { rows: [newRoom] };
      } else if (text.includes('SELECT * FROM rooms WHERE hostel_id = $1')) {
        const rooms = mockDB.rooms.filter(r => r.hostel_id == params[0]);
        result = { rows: rooms.map(r => {
          const studentCount = mockDB.students.filter(s => s.room_id == r.room_number && s.hostel_id == r.hostel_id).length;
          return { ...r, student_count: studentCount, status: studentCount >= r.capacity ? 'occupied' : 'available' };
        }) };
      }

      if (callback) {
        callback(null, result);
      }
      return result;
    } catch (err) {
      if (callback) {
        callback(err);
      }
      throw err;
    }
  }
};
