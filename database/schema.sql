-- Hostel Management System - Complete PostgreSQL Schema (32 Tables)

-- Module 1: User Management
CREATE TABLE admins (
    admin_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE owners (
    owner_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE wardens (
    warden_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_roles (
    role_id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT
);

CREATE TABLE role_permissions (
    permission_id SERIAL PRIMARY KEY,
    role_id INT REFERENCES user_roles(role_id),
    module_name VARCHAR(100) NOT NULL,
    can_create BOOLEAN DEFAULT FALSE,
    can_update BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE,
    can_view BOOLEAN DEFAULT TRUE
);

-- Module 2: Hostel Management
CREATE TABLE hostels (
    hostel_id SERIAL PRIMARY KEY,
    hostel_name VARCHAR(120) NOT NULL,
    address TEXT NOT NULL,
    owner_id INT REFERENCES owners(owner_id),
    warden_id INT REFERENCES wardens(warden_id),
    total_rooms INT DEFAULT 0,
    profile_image TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE hostel_settings (
    setting_id SERIAL PRIMARY KEY,
    hostel_id INT REFERENCES hostels(hostel_id),
    fee_due_day INT DEFAULT 5,
    electricity_rate DECIMAL(10, 2) DEFAULT 0.00,
    late_fee DECIMAL(10, 2) DEFAULT 0.00
);

CREATE TABLE hostel_documents (
    document_id SERIAL PRIMARY KEY,
    hostel_id INT REFERENCES hostels(hostel_id),
    document_type VARCHAR(100) NOT NULL,
    file_path TEXT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE warden_assignment_history (
    history_id SERIAL PRIMARY KEY,
    hostel_id INT REFERENCES hostels(hostel_id),
    old_warden_id INT REFERENCES wardens(warden_id),
    new_warden_id INT REFERENCES wardens(warden_id),
    changed_by_owner INT REFERENCES owners(owner_id),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Module 3: Room Management
CREATE TABLE room_types (
    room_type_id SERIAL PRIMARY KEY,
    type_name VARCHAR(50) NOT NULL UNIQUE, -- e.g., '1-seater', '2-seater'
    capacity INT NOT NULL,
    description TEXT
);

CREATE TABLE rooms (
    room_id SERIAL PRIMARY KEY,
    hostel_id INT REFERENCES hostels(hostel_id),
    room_number VARCHAR(20) NOT NULL,
    room_type_id INT REFERENCES room_types(room_type_id),
    capacity INT NOT NULL,
    occupied_count INT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'available' -- available, full, maintenance
);

CREATE TABLE room_allocations (
    allocation_id SERIAL PRIMARY KEY,
    room_id INT REFERENCES rooms(room_id),
    student_id INT NOT NULL, -- Will reference student_id after creating student table
    allocated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    vacated_at TIMESTAMP
);

CREATE TABLE room_maintenance (
    maintenance_id SERIAL PRIMARY KEY,
    room_id INT REFERENCES rooms(room_id),
    issue TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, in-progress, resolved
    reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP
);

-- Module 4: Student Management
CREATE TABLE students (
    student_id SERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    guardian_name VARCHAR(120),
    address TEXT,
    nationality VARCHAR(50),
    religion VARCHAR(50),
    passport_no VARCHAR(50),
    hostel_id INT REFERENCES hostels(hostel_id),
    room_id INT REFERENCES rooms(room_id),
    admission_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'active', -- active, inactive, graduated
    added_by_admin INT REFERENCES admins(admin_id)
);

-- Now add FK to room_allocations
ALTER TABLE room_allocations ADD CONSTRAINT fk_student FOREIGN KEY (student_id) REFERENCES students(student_id);

CREATE TABLE student_documents (
    document_id SERIAL PRIMARY KEY,
    student_id INT REFERENCES students(student_id),
    document_type VARCHAR(100) NOT NULL,
    file_path TEXT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE student_attendance (
    attendance_id SERIAL PRIMARY KEY,
    student_id INT REFERENCES students(student_id),
    date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'present' -- present, absent, leave
);

CREATE TABLE student_exit_records (
    exit_id SERIAL PRIMARY KEY,
    student_id INT REFERENCES students(student_id),
    exit_date DATE NOT NULL,
    reason TEXT NOT NULL
);

-- Module 5: Finance Management
CREATE TABLE fees (
    fee_id SERIAL PRIMARY KEY,
    student_id INT REFERENCES students(student_id),
    hostel_id INT REFERENCES hostels(hostel_id),
    month VARCHAR(20) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- paid, pending, late
    updated_by_warden INT REFERENCES wardens(warden_id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
    payment_id SERIAL PRIMARY KEY,
    fee_id INT REFERENCES fees(fee_id),
    payment_method VARCHAR(50) NOT NULL, -- cash, online, bank
    transaction_id VARCHAR(120) UNIQUE,
    paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE fee_reminders (
    reminder_id SERIAL PRIMARY KEY,
    student_id INT REFERENCES students(student_id),
    message TEXT NOT NULL,
    sent_by_warden INT REFERENCES wardens(warden_id),
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE expense_categories (
    category_id SERIAL PRIMARY KEY,
    category_name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE expenses (
    expense_id SERIAL PRIMARY KEY,
    hostel_id INT REFERENCES hostels(hostel_id),
    category_id INT REFERENCES expense_categories(category_id),
    amount DECIMAL(10, 2) NOT NULL,
    description TEXT,
    added_by_warden INT REFERENCES wardens(warden_id),
    expense_date DATE DEFAULT CURRENT_DATE
);

-- Module 6: Complaint Management
CREATE TABLE complaints (
    complaint_id SERIAL PRIMARY KEY,
    student_id INT REFERENCES students(student_id),
    hostel_id INT REFERENCES hostels(hostel_id),
    complaint_text TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, in-progress, resolved
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_by_warden INT REFERENCES wardens(warden_id)
);

CREATE TABLE complaint_comments (
    comment_id SERIAL PRIMARY KEY,
    complaint_id INT REFERENCES complaints(complaint_id),
    comment_text TEXT NOT NULL,
    created_by_role VARCHAR(20) NOT NULL, -- admin, warden, owner
    created_by_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Module 7: System Logging & Auditing
CREATE TABLE activity_logs (
    log_id SERIAL PRIMARY KEY,
    user_role VARCHAR(20) NOT NULL,
    user_id INT NOT NULL,
    action TEXT NOT NULL,
    module VARCHAR(100) NOT NULL,
    reference_id INT,
    description TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE login_history (
    login_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    role VARCHAR(20) NOT NULL,
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(50),
    device TEXT
);

CREATE TABLE system_notifications (
    notification_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    role VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_trail (
    audit_id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id INT NOT NULL,
    old_value JSONB,
    new_value JSONB,
    changed_by_role VARCHAR(20) NOT NULL,
    changed_by_id INT NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Module 8: Analytics & Summaries
CREATE TABLE daily_financial_summary (
    summary_id SERIAL PRIMARY KEY,
    hostel_id INT REFERENCES hostels(hostel_id),
    date DATE DEFAULT CURRENT_DATE,
    total_income DECIMAL(15, 2) DEFAULT 0.00,
    total_expense DECIMAL(15, 2) DEFAULT 0.00,
    net_income DECIMAL(15, 2) DEFAULT 0.00
);

CREATE TABLE monthly_analytics (
    analytics_id SERIAL PRIMARY KEY,
    hostel_id INT REFERENCES hostels(hostel_id),
    month VARCHAR(20) NOT NULL,
    year INT NOT NULL,
    total_students INT DEFAULT 0,
    total_income DECIMAL(15, 2) DEFAULT 0.00,
    total_expense DECIMAL(15, 2) DEFAULT 0.00,
    net_profit DECIMAL(15, 2) DEFAULT 0.00
);

CREATE TABLE occupancy_analytics (
    occupancy_id SERIAL PRIMARY KEY,
    hostel_id INT REFERENCES hostels(hostel_id),
    date DATE DEFAULT CURRENT_DATE,
    total_rooms INT DEFAULT 0,
    occupied_rooms INT DEFAULT 0,
    vacant_rooms INT DEFAULT 0
);

CREATE TABLE fee_collection_stats (
    stat_id SERIAL PRIMARY KEY,
    hostel_id INT REFERENCES hostels(hostel_id),
    month VARCHAR(20) NOT NULL,
    paid_students INT DEFAULT 0,
    pending_students INT DEFAULT 0,
    total_collected DECIMAL(15, 2) DEFAULT 0.00
);
