const crypto = require('crypto');
const supabase = require('./supabase');

function rowToDoc(row, selectPassword = false) {
  if (!row) return null;
  const doc = { 
    id: row.id, 
    _id: row.id, 
    ...row.data 
  };
  
  // Map PostgreSQL columns back to document attributes
  if (row.email) doc.email = row.email;
  if (row.phone) doc.phone = row.phone;
  if (row.role) doc.role = row.role;
  if (row.is_active !== undefined) doc.isActive = row.is_active;
  if (row.email_verified !== undefined) doc.emailVerified = row.email_verified;
  
  if (row.name && !doc.name) doc.name = row.name;
  if (row.slug && !doc.slug) doc.slug = row.slug;
  if (row.category && !doc.category) doc.category = row.category;
  if (row.subcategory && !doc.subcategory) doc.subcategory = row.subcategory;
  if (row.status && !doc.status) doc.status = row.status;
  if (row.featured !== undefined) doc.featured = row.featured;
  if (row.popular !== undefined) doc.popular = row.popular;
  if (row.base_price !== undefined) {
    if (!doc.pricing) doc.pricing = {};
    doc.pricing.basePrice = Number(row.base_price);
  }
  
  if (row.user_id) doc.user = row.user_id;
  if (row.product_id) doc.product = row.product_id;
  if (row.order_number) doc.orderNumber = row.order_number;
  if (row.warranty_number) doc.warrantyNumber = row.warranty_number;
  if (row.serial_number) doc.serialNumber = row.serial_number;
  if (row.expiry_date) doc.expiryDate = row.expiry_date;
  
  if (row.created_at) doc.createdAt = row.created_at;
  if (row.updated_at) doc.updatedAt = row.updated_at;

  // Exclude password by default (simulates mongoose select: false)
  if (!selectPassword) {
    delete doc.password;
  }

  // Mock doc save method
  return new MongooseDocMock(row.table_name || '', doc);
}

function applyFilter(table, queryBuilder, filter) {
  if (!filter) return queryBuilder;
  
  for (const [key, value] of Object.entries(filter)) {
    if (key === '$or') {
      const orConditions = value.map(cond => {
        const [k, v] = Object.entries(cond)[0];
        const col = mapFieldToColumn(table, k);
        return `${col}.eq.${v}`;
      }).join(',');
      queryBuilder = queryBuilder.or(orConditions);
    } else {
      const col = mapFieldToColumn(table, key);
      if (value && typeof value === 'object') {
        if ('$gt' in value) {
          queryBuilder = queryBuilder.gt(col, value.$gt);
        } else if ('$lt' in value) {
          queryBuilder = queryBuilder.lt(col, value.$lt);
        } else if ('$gte' in value) {
          queryBuilder = queryBuilder.gte(col, value.$gte);
        } else if ('$lte' in value) {
          queryBuilder = queryBuilder.lte(col, value.$lte);
        } else if ('$ne' in value) {
          queryBuilder = queryBuilder.neq(col, value.$ne);
        } else if ('$in' in value) {
          queryBuilder = queryBuilder.in(col, value.$in);
        } else if ('$regex' in value) {
          // PostgreSQL ilike for regex-like search
          const pattern = value.$regex.toString().replace(/^\/|\/[gi]*$/g, '');
          queryBuilder = queryBuilder.ilike(col, `%${pattern}%`);
        }
      } else {
        queryBuilder = queryBuilder.eq(col, value);
      }
    }
  }
  return queryBuilder;
}

function mapFieldToColumn(table, field) {
  const tableColumns = {
    'users': ['id', 'email', 'phone', 'role', 'is_active', 'email_verified', 'created_at', 'updated_at'],
    'products': ['id', 'name', 'slug', 'category', 'subcategory', 'status', 'featured', 'popular', 'base_price', 'created_at', 'updated_at'],
    'inquiries': ['id', 'user_id', 'product_id', 'type', 'status', 'priority', 'created_at', 'updated_at'],
    'orders': ['id', 'user_id', 'order_number', 'status', 'payment_status', 'created_at', 'updated_at'],
    'reviews': ['id', 'product_id', 'user_id', 'rating', 'created_at', 'updated_at'],
    'warranties': ['id', 'user_id', 'product_id', 'warranty_number', 'serial_number', 'status', 'expiry_date', 'created_at', 'updated_at']
  };

  const fieldMappings = {
    'id': 'id',
    '_id': 'id',
    'email': 'email',
    'phone': 'phone',
    'role': 'role',
    'isActive': 'is_active',
    'emailVerified': 'email_verified',
    'name': 'name',
    'slug': 'slug',
    'category': 'category',
    'subcategory': 'subcategory',
    'status': 'status',
    'featured': 'featured',
    'popular': 'popular',
    'basePrice': 'base_price',
    'pricing.basePrice': 'base_price',
    'user': 'user_id',
    'user_id': 'user_id',
    'product': 'product_id',
    'product_id': 'product_id',
    'orderNumber': 'order_number',
    'order_number': 'order_number',
    'paymentStatus': 'payment_status',
    'payment_status': 'payment_status',
    'warrantyNumber': 'warranty_number',
    'serialNumber': 'serial_number',
    'expiryDate': 'expiry_date',
    'expiry_date': 'expiry_date',
    'type': 'type',
    'priority': 'priority',
    'rating': 'rating',
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'created_at': 'created_at',
    'updated_at': 'updated_at'
  };

  const dbCol = fieldMappings[field] || field;
  const validCols = tableColumns[table] || [];

  if (validCols.includes(dbCol)) {
    return dbCol;
  }

  // Handle nested paths using dot notation for JSONB mapping
  if (field.includes('.')) {
    const parts = field.split('.');
    let path = 'data';
    for (let i = 0; i < parts.length - 1; i++) {
      path += `->${parts[i]}`;
    }
    path += `->>${parts[parts.length - 1]}`;
    return path;
  }

  return `data->>${field}`;
}

class MongooseDocMock {
  constructor(table, data) {
    this._table = table;
    Object.assign(this, data);
  }

  async save() {
    const table = this._table;
    const id = this.id || this._id || crypto.randomUUID();
    this.id = id;
    this._id = id;

    const row = {
      id,
      updated_at: new Date().toISOString()
    };

    let existingData = {};
    try {
      const { data: existing } = await supabase.from(table).select('data').eq('id', id).maybeSingle();
      if (existing && existing.data) {
        existingData = existing.data;
      }
    } catch (err) {
      console.warn('Failed to retrieve existing data for merge:', err.message);
    }

    const docData = { ...existingData, ...this };
    delete docData._table;
    delete docData.id;
    delete docData._id;

    // Extract columns depending on the table
    if (table === 'users') {
      if (this.email) row.email = this.email;
      if (this.phone) row.phone = this.phone;
      if (this.role) row.role = this.role;
      if (this.isActive !== undefined) row.is_active = this.isActive;
      if (this.emailVerified !== undefined) row.email_verified = this.emailVerified;
    } else if (table === 'products') {
      if (this.name) row.name = this.name;
      if (this.slug) row.slug = this.slug;
      if (this.category) row.category = this.category;
      if (this.subcategory) row.subcategory = this.subcategory;
      if (this.status) row.status = this.status;
      if (this.featured !== undefined) row.featured = this.featured;
      if (this.popular !== undefined) row.popular = this.popular;
      if (this.pricing && this.pricing.basePrice !== undefined) row.base_price = this.pricing.basePrice;
    } else if (table === 'inquiries') {
      if (this.user) row.user_id = typeof this.user === 'object' ? this.user.id || this.user._id : this.user;
      if (this.product) row.product_id = typeof this.product === 'object' ? this.product.id || this.product._id : this.product;
      if (this.type) row.type = this.type;
      if (this.status) row.status = this.status;
      if (this.priority) row.priority = this.priority;
    } else if (table === 'orders') {
      if (this.user) row.user_id = typeof this.user === 'object' ? this.user.id || this.user._id : this.user;
      if (this.orderNumber) row.order_number = this.orderNumber;
      if (this.status) row.status = this.status;
      if (this.paymentStatus) row.payment_status = this.paymentStatus;
    } else if (table === 'reviews') {
      if (this.product) row.product_id = typeof this.product === 'object' ? this.product.id || this.product._id : this.product;
      if (this.user) row.user_id = typeof this.user === 'object' ? this.user.id || this.user._id : this.user;
      if (this.rating !== undefined) row.rating = this.rating;
    } else if (table === 'warranties') {
      if (this.user) row.user_id = typeof this.user === 'object' ? this.user.id || this.user._id : this.user;
      if (this.product) row.product_id = typeof this.product === 'object' ? this.product.id || this.product._id : this.product;
      if (this.warrantyNumber) row.warranty_number = this.warrantyNumber;
      if (this.serialNumber) row.serial_number = this.serialNumber;
      if (this.status) row.status = this.status;
      if (this.expiryDate) row.expiry_date = this.expiryDate;
    }

    row.data = docData;

    const { data: savedData, error } = await supabase.from(table).upsert([row]).select().single();
    if (error) throw error;
    
    // Update self with saved database columns and data
    Object.assign(this, rowToDoc({ ...savedData, table_name: table }, true));
    return this;
  }

  async populate(field) {
    if (field === 'orders') {
      const { data: refData } = await supabase.from('orders').select('*').eq('user_id', this.id);
      if (refData) {
        this.orders = refData.map(r => rowToDoc({ ...r, table_name: 'orders' }));
      } else {
        this.orders = [];
      }
    }
    return this;
  }
}

class MongooseQueryMock {
  constructor(table, filter = {}, single = false) {
    this.table = table;
    this.filter = filter;
    this.single = single;
    this.selectPassword = false;
    this._select = '*';
    this._sort = null;
    this._limit = null;
    this._skip = null;
    this._populates = [];
  }

  select(fields) {
    if (typeof fields === 'string') {
      if (fields.includes('+password')) {
        this.selectPassword = true;
      }
    }
    return this;
  }

  sort(sortObj) {
    this._sort = sortObj;
    return this;
  }

  limit(val) {
    this._limit = val;
    return this;
  }

  skip(val) {
    this._skip = val;
    return this;
  }

  populate(field) {
    this._populates.push({ field });
    return this;
  }

  async execute() {
    let q = supabase.from(this.table).select(this._select);
    q = applyFilter(this.table, q, this.filter);

    if (this._sort) {
      for (const [col, dir] of Object.entries(this._sort)) {
        const dbCol = col === 'createdAt' ? 'created_at' : col;
        q = q.order(dbCol, { ascending: dir === 1 || dir === 'asc' });
      }
    }

    if (this.single) {
      const { data, error } = await q.maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return rowToDoc({ ...data, table_name: this.table }, this.selectPassword);
    }

    if (this._skip !== null && this._limit !== null) {
      q = q.range(this._skip, this._skip + this._limit - 1);
    } else if (this._limit !== null) {
      q = q.limit(this._limit);
    }

    const { data, error } = await q;
    if (error) throw error;
    if (!data) return [];

    let docs = data.map(row => rowToDoc({ ...row, table_name: this.table }, this.selectPassword));

    // Handle Mongoose-style populates
    if (this._populates.length > 0 && docs.length > 0) {
      for (const pop of this._populates) {
        const field = pop.field;

        // 1. Simple 'user', 'responder', 'assignedTo', 'resolvedBy'
        if (field === 'user' || field === 'responder' || field === 'assignedTo' || field === 'resolvedBy') {
          const ids = [...new Set(docs.map(d => d[field]).filter(val => typeof val === 'string'))];
          if (ids.length > 0) {
            const { data: refData } = await supabase.from('users').select('*').in('id', ids);
            if (refData) {
              const refMap = {};
              refData.forEach(r => { refMap[r.id] = rowToDoc({ ...r, table_name: 'users' }); });
              docs.forEach(d => { if (typeof d[field] === 'string') d[field] = refMap[d[field]] || d[field]; });
            }
          }
        }

        // 2. Simple 'product'
        else if (field === 'product') {
          const ids = [...new Set(docs.map(d => d.product).filter(val => typeof val === 'string'))];
          if (ids.length > 0) {
            const { data: refData } = await supabase.from('products').select('*').in('id', ids);
            if (refData) {
              const refMap = {};
              refData.forEach(r => { refMap[r.id] = rowToDoc({ ...r, table_name: 'products' }); });
              docs.forEach(d => { if (typeof d.product === 'string') d.product = refMap[d.product] || d.product; });
            }
          }
        }

        // 3. relatedProducts (array of product IDs)
        else if (field === 'relatedProducts') {
          const allIds = new Set();
          docs.forEach(d => {
            if (Array.isArray(d.relatedProducts)) {
              d.relatedProducts.forEach(id => {
                if (typeof id === 'string') allIds.add(id);
              });
            }
          });
          const idsArray = [...allIds];
          if (idsArray.length > 0) {
            const { data: refData } = await supabase.from('products').select('*').in('id', idsArray);
            if (refData) {
              const refMap = {};
              refData.forEach(r => { refMap[r.id] = rowToDoc({ ...r, table_name: 'products' }); });
              docs.forEach(d => {
                if (Array.isArray(d.relatedProducts)) {
                  d.relatedProducts = d.relatedProducts.map(id => refMap[id] || id);
                }
              });
            }
          }
        }

        // 4. reviews.user
        else if (field === 'reviews.user') {
          const allUserIds = new Set();
          docs.forEach(d => {
            if (Array.isArray(d.reviews)) {
              d.reviews.forEach(r => {
                if (typeof r.user === 'string') allUserIds.add(r.user);
              });
            }
          });
          const userIdsArray = [...allUserIds];
          if (userIdsArray.length > 0) {
            const { data: refData } = await supabase.from('users').select('*').in('id', userIdsArray);
            if (refData) {
              const refMap = {};
              refData.forEach(r => { refMap[r.id] = rowToDoc({ ...r, table_name: 'users' }); });
              docs.forEach(d => {
                if (Array.isArray(d.reviews)) {
                  d.reviews.forEach(r => {
                    if (typeof r.user === 'string') r.user = refMap[r.user] || r.user;
                  });
                }
              });
            }
          }
        }

        // 5. items.product
        else if (field === 'items.product') {
          const allProductIds = new Set();
          docs.forEach(d => {
            if (Array.isArray(d.items)) {
              d.items.forEach(item => {
                if (typeof item.product === 'string') allProductIds.add(item.product);
              });
            }
          });
          const productIdsArray = [...allProductIds];
          if (productIdsArray.length > 0) {
            const { data: refData } = await supabase.from('products').select('*').in('id', productIdsArray);
            if (refData) {
              const refMap = {};
              refData.forEach(r => { refMap[r.id] = rowToDoc({ ...r, table_name: 'products' }); });
              docs.forEach(d => {
                if (Array.isArray(d.items)) {
                  d.items.forEach(item => {
                    if (typeof item.product === 'string') item.product = refMap[item.product] || item.product;
                  });
                }
              });
            }
          }
        }

        // 6. timeline.updatedBy
        else if (field === 'timeline.updatedBy') {
          const allUserIds = new Set();
          docs.forEach(d => {
            if (Array.isArray(d.timeline)) {
              d.timeline.forEach(t => {
                if (typeof t.updatedBy === 'string') allUserIds.add(t.updatedBy);
              });
            }
          });
          const userIdsArray = [...allUserIds];
          if (userIdsArray.length > 0) {
            const { data: refData } = await supabase.from('users').select('*').in('id', userIdsArray);
            if (refData) {
              const refMap = {};
              refData.forEach(r => { refMap[r.id] = rowToDoc({ ...r, table_name: 'users' }); });
              docs.forEach(d => {
                if (Array.isArray(d.timeline)) {
                  d.timeline.forEach(t => {
                    if (typeof t.updatedBy === 'string') t.updatedBy = refMap[t.updatedBy] || t.updatedBy;
                  });
                }
              });
            }
          }
        }

        // 7. responses.responder
        else if (field === 'responses.responder') {
          const allUserIds = new Set();
          docs.forEach(d => {
            if (Array.isArray(d.responses)) {
              d.responses.forEach(r => {
                if (typeof r.responder === 'string') allUserIds.add(r.responder);
              });
            }
          });
          const userIdsArray = [...allUserIds];
          if (userIdsArray.length > 0) {
            const { data: refData } = await supabase.from('users').select('*').in('id', userIdsArray);
            if (refData) {
              const refMap = {};
              refData.forEach(r => { refMap[r.id] = rowToDoc({ ...r, table_name: 'users' }); });
              docs.forEach(d => {
                if (Array.isArray(d.responses)) {
                  d.responses.forEach(r => {
                    if (typeof r.responder === 'string') r.responder = refMap[r.responder] || r.responder;
                  });
                }
              });
            }
          }
        }

        // 8. internalNotes.addedBy
        else if (field === 'internalNotes.addedBy') {
          const allUserIds = new Set();
          docs.forEach(d => {
            if (Array.isArray(d.internalNotes)) {
              d.internalNotes.forEach(n => {
                if (typeof n.addedBy === 'string') allUserIds.add(n.addedBy);
              });
            }
          });
          const userIdsArray = [...allUserIds];
          if (userIdsArray.length > 0) {
            const { data: refData } = await supabase.from('users').select('*').in('id', userIdsArray);
            if (refData) {
              const refMap = {};
              refData.forEach(r => { refMap[r.id] = rowToDoc({ ...r, table_name: 'users' }); });
              docs.forEach(d => {
                if (Array.isArray(d.internalNotes)) {
                  d.internalNotes.forEach(n => {
                    if (typeof n.addedBy === 'string') n.addedBy = refMap[n.addedBy] || n.addedBy;
                  });
                }
              });
            }
          }
        }

        // 9. orders (virtual relation)
        else if (field === 'orders') {
          const userIds = docs.map(d => d.id);
          if (userIds.length > 0) {
            const { data: refData } = await supabase.from('orders').select('*').in('user_id', userIds);
            if (refData) {
              const refMap = {};
              refData.forEach(r => {
                if (!refMap[r.user_id]) refMap[r.user_id] = [];
                refMap[r.user_id].push(rowToDoc({ ...r, table_name: 'orders' }));
              });
              docs.forEach(d => {
                d.orders = refMap[d.id] || [];
              });
            } else {
              docs.forEach(d => { d.orders = []; });
            }
          }
        }
      }
    }

    return docs;
  }

  // Promise-like behavior (then/catch)
  then(onfulfilled, onrejected) {
    return this.execute().then(onfulfilled, onrejected);
  }
}

// Main Model creator
function createMockModel(table) {
  const Model = function(data) {
    return new MongooseDocMock(table, data);
  };

  Model.find = function(filter = {}) {
    return new MongooseQueryMock(table, filter, false);
  };

  Model.findOne = function(filter = {}) {
    return new MongooseQueryMock(table, filter, true);
  };

  Model.findById = function(id) {
    return new MongooseQueryMock(table, { id }, true);
  };

  Model.create = async function(data) {
    const doc = new MongooseDocMock(table, data);
    return await doc.save();
  };

  Model.findByIdAndUpdate = async function(id, update, options = {}) {
    const { data: existing } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
    if (!existing) return null;

    const currentDoc = rowToDoc({ ...existing, table_name: table }, true);
    
    // Apply mongoose style update
    const updateData = update.$set ? update.$set : update;
    Object.assign(currentDoc, updateData);

    return await currentDoc.save();
  };

  Model.findByIdAndDelete = async function(id) {
    const { data: existing } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
    if (!existing) return null;

    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;

    return rowToDoc({ ...existing, table_name: table }, true);
  };

  Model.countDocuments = async function(filter = {}) {
    let q = supabase.from(table).select('*', { count: 'exact', head: true });
    q = applyFilter(table, q, filter);
    const { count, error } = await q;
    if (error) throw error;
    return count || 0;
  };

  Model.aggregate = async function(pipeline) {
    // Basic dashboard stats aggregate implementation
    // Supports User count by role and businessType
    if (table === 'users') {
      const { data, error } = await supabase.from('users').select('role, data');
      if (error) throw error;
      
      const isRoleGroup = pipeline.some(stage => stage.$group && stage.$group._id === '$role');
      const isBusinessTypeGroup = pipeline.some(stage => stage.$group && stage.$group._id === '$businessType');

      if (isRoleGroup) {
        const roles = {};
        data.forEach(row => {
          const role = row.role || 'user';
          roles[role] = (roles[role] || 0) + 1;
        });
        return Object.entries(roles).map(([k, v]) => ({ _id: k, count: v }));
      }

      if (isBusinessTypeGroup) {
        const types = {};
        data.forEach(row => {
          const doc = rowToDoc({ ...row, table_name: 'users' });
          const bType = doc.businessType || 'individual';
          types[bType] = (types[bType] || 0) + 1;
        });
        return Object.entries(types).map(([k, v]) => ({ _id: k, count: v }));
      }

      // Check for users with orders aggregate (user_id count in orders)
      const hasOrdersMatch = pipeline.some(stage => stage.$lookup && stage.$lookup.from === 'orders');
      if (hasOrdersMatch) {
        const { data: ordersData } = await supabase.from('orders').select('user_id');
        const userOrderCounts = {};
        if (ordersData) {
          ordersData.forEach(o => {
            if (o.user_id) userOrderCounts[o.user_id] = (userOrderCounts[o.user_id] || 0) + 1;
          });
        }
        return data.map(row => {
          const doc = rowToDoc({ ...row, table_name: 'users' });
          return {
            ...doc,
            orderCount: userOrderCounts[row.id] || 0
          };
        }).filter(u => u.orderCount > 0);
      }
    }
    
    return [];
  };

  return Model;
}

module.exports = {
  createMockModel,
  rowToDoc
};
