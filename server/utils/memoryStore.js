/**
 * Pure JavaScript In-Memory Document Store & Model Adapter
 * Enables instantaneous zero-config startup without downloading external binaries.
 */

const crypto = require('crypto');

function generateId() {
  return crypto.randomBytes(12).toString('hex');
}

class MemoryEventDocument {
  constructor(data) {
    this._id = data._id ? String(data._id) : generateId();
    this.eventName = data.eventName || '';
    this.organizer = data.organizer || '';
    this.faculty = data.faculty || 'General';
    this.date = data.date ? new Date(data.date) : new Date();
    this.venue = data.venue || '';
    this.description = data.description || '';
    this.contact = data.contact || '';
    this.capacity = Number(data.capacity) || 0;
    this.attendees = (data.attendees || []).map(a => ({
      _id: a._id ? String(a._id) : generateId(),
      name: a.name,
      email: a.email,
      ticketCode: a.ticketCode || ('NTR-' + Math.random().toString(36).substring(2, 8).toUpperCase()),
      bookedAt: a.bookedAt ? new Date(a.bookedAt) : new Date()
    }));
    this.waitlist = (data.waitlist || []).map(w => ({
      _id: w._id ? String(w._id) : generateId(),
      name: w.name,
      email: w.email,
      joinedAt: w.joinedAt ? new Date(w.joinedAt) : new Date()
    }));
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
  }

  get seatsLeft() {
    if (this.capacity === 0) return null;
    return Math.max(0, this.capacity - this.attendees.length);
  }

  get isFull() {
    if (this.capacity === 0) return false;
    return this.attendees.length >= this.capacity;
  }

  toJSON() {
    return {
      _id: this._id,
      eventName: this.eventName,
      organizer: this.organizer,
      faculty: this.faculty,
      date: this.date,
      venue: this.venue,
      description: this.description,
      contact: this.contact,
      capacity: this.capacity,
      attendees: this.attendees,
      waitlist: this.waitlist,
      createdAt: this.createdAt,
      seatsLeft: this.seatsLeft,
      isFull: this.isFull
    };
  }

  async save() {
    const idx = memoryStore.events.findIndex(e => String(e._id) === String(this._id));
    if (idx >= 0) {
      memoryStore.events[idx] = this;
    } else {
      memoryStore.events.push(this);
    }
    return this;
  }
}

class MemoryAdminDocument {
  constructor(data) {
    this._id = data._id ? String(data._id) : generateId();
    this.username = (data.username || '').toLowerCase().trim();
    this.passwordHash = data.passwordHash || '';
    this.role = data.role || 'club_exec';
    this.createdAt = data.createdAt ? new Date(data.createdAt) : new Date();
  }

  toJSON() {
    return {
      _id: this._id,
      username: this.username,
      passwordHash: this.passwordHash,
      role: this.role,
      createdAt: this.createdAt
    };
  }

  async save() {
    const idx = memoryStore.admins.findIndex(a => String(a._id) === String(this._id));
    if (idx >= 0) {
      memoryStore.admins[idx] = this;
    } else {
      memoryStore.admins.push(this);
    }
    return this;
  }
}

const memoryStore = {
  events: [],
  admins: [],
  useMemoryFallback: false
};

class EventQuery {
  constructor(query = {}) {
    this.query = query;
    this.sortObj = { date: 1 };
  }

  sort(sortObj) {
    this.sortObj = sortObj;
    return this;
  }

  _execute() {
    let results = [...memoryStore.events];

    if (this.query.faculty) {
      if (this.query.faculty instanceof RegExp) {
        results = results.filter(e => this.query.faculty.test(e.faculty));
      } else {
        results = results.filter(e => (e.faculty || '').toLowerCase() === String(this.query.faculty).toLowerCase());
      }
    }

    if (this.query.$or) {
      results = results.filter(e => {
        return this.query.$or.some(condition => {
          for (const key in condition) {
            const regex = condition[key];
            if (e[key] && regex.test(e[key])) return true;
          }
          return false;
        });
      });
    }

    if (this.query.date) {
      if (this.query.date.$gte) {
        results = results.filter(e => new Date(e.date) >= new Date(this.query.date.$gte));
      }
      if (this.query.date.$lte) {
        results = results.filter(e => new Date(e.date) <= new Date(this.query.date.$lte));
      }
      if (this.query.date.$lt) {
        results = results.filter(e => new Date(e.date) < new Date(this.query.date.$lt));
      }
    }

    if (this.sortObj) {
      results.sort((a, b) => {
        if (this.sortObj.date === 1) return new Date(a.date) - new Date(b.date);
        if (this.sortObj.date === -1) return new Date(b.date) - new Date(a.date);
        return 0;
      });
    }

    return results;
  }

  then(resolve, reject) {
    try {
      resolve(this._execute());
    } catch (err) {
      if (reject) reject(err);
      else throw err;
    }
  }
}

class AdminQuery {
  constructor(admin) {
    this.admin = admin;
  }

  select(fields) {
    return this;
  }

  then(resolve, reject) {
    if (!this.admin) {
      resolve(null);
      return;
    }
    resolve({
      _id: this.admin._id,
      username: this.admin.username,
      role: this.admin.role,
      createdAt: this.admin.createdAt
    });
  }
}

const MemoryEventModel = {
  find(query = {}) {
    return new EventQuery(query);
  },

  async findById(id) {
    return memoryStore.events.find(e => String(e._id) === String(id)) || null;
  },

  async findByIdAndDelete(id) {
    const idx = memoryStore.events.findIndex(e => String(e._id) === String(id));
    if (idx === -1) return null;
    const removed = memoryStore.events.splice(idx, 1)[0];
    return removed;
  },

  async countDocuments() {
    return memoryStore.events.length;
  },

  async insertMany(docs) {
    const created = docs.map(d => new MemoryEventDocument(d));
    memoryStore.events.push(...created);
    return created;
  },

  async create(doc) {
    const instance = new MemoryEventDocument(doc);
    await instance.save();
    return instance;
  }
};

const MemoryAdminModel = {
  async findOne(query = {}) {
    if (query.username) {
      return memoryStore.admins.find(a => a.username === query.username.toLowerCase()) || null;
    }
    return memoryStore.admins[0] || null;
  },

  findById(id) {
    const admin = memoryStore.admins.find(a => String(a._id) === String(id));
    return new AdminQuery(admin);
  },

  async countDocuments() {
    return memoryStore.admins.length;
  },

  async create(doc) {
    const instance = new MemoryAdminDocument(doc);
    await instance.save();
    return instance;
  }
};

module.exports = {
  memoryStore,
  MemoryEventDocument,
  MemoryEventModel,
  MemoryAdminDocument,
  MemoryAdminModel
};
