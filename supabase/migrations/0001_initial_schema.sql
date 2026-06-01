-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for encryption/hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create roles table
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE, -- admin, manager, staff
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create users table (extends Supabase auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create customers table with encrypted DOB and password
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    mobile TEXT NOT NULL UNIQUE,
    dob DATE NOT NULL, -- Date of Birth (encrypted at app level, stored as DATE
    email TEXT,
    password_hash TEXT, -- Hashed password for verification
    visit_count INTEGER DEFAULT 0,
    total_time_spent INTEGER DEFAULT 0, -- in minutes
    total_spent NUMERIC DEFAULT 0,
    last_visit TIMESTAMPTZ,
    failed_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create verification_attempts table
CREATE TABLE verification_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    step TEXT NOT NULL, -- dob, name_selection, password, otp
    success BOOLEAN NOT NULL DEFAULT false,
    ip_address TEXT,
    user_agent TEXT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create audit_logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action TEXT NOT NULL, -- login, logout, verification_success, verification_failed, dashboard_access, etc.
    entity_type TEXT, -- customer, staff
    entity_id UUID,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create otps table for one-time passwords
CREATE TABLE otps (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    type TEXT NOT NULL, -- sms, email
    expires_at TIMESTAMPTZ NOT NULL,
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create offers_promotions table
CREATE TABLE offers_promotions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    discount_percent NUMERIC,
    flat_discount NUMERIC,
    valid_from TIMESTAMPTZ NOT NULL,
    valid_until TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT true,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create zones table
CREATE TABLE zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL, -- Gaming, Movie, Internet
    description TEXT,
    rate_per_hour NUMERIC NOT NULL,
    color TEXT DEFAULT '#ef4444',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create stations table
CREATE TABLE stations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- G1, G2, M1, etc.
    status TEXT NOT NULL DEFAULT 'available', -- available, occupied, reserved, maintenance
    row INTEGER,
    col INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create reservations table
CREATE TABLE reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    station_id UUID REFERENCES stations(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed', -- confirmed, checked_in, completed, cancelled
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create sessions table
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    station_id UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active', -- active, paused, completed
    start_time TIMESTAMPTZ DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    total_duration INTEGER DEFAULT 0, -- in minutes
    total_charges NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create session_logs table (for pause/resume tracking)
CREATE TABLE session_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- start, pause, resume, end
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create menu_categories table
CREATE TABLE menu_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create menu_items table
CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID REFERENCES menu_categories(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    image_url TEXT,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create orders table
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, preparing, ready, served
    total NUMERIC DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create order_items table
CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    price NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    amount NUMERIC NOT NULL,
    method TEXT NOT NULL, -- cash, upi, card
    status TEXT NOT NULL DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default roles
INSERT INTO roles (name, description) VALUES
('admin', 'Full access to all features'),
('manager', 'Manage operations and staff'),
('staff', 'Day-to-day operations');

-- Insert default zones
INSERT INTO zones (name, description, rate_per_hour, color) VALUES
('Gaming', 'Gaming stations with high-end PCs', 100, '#ef4444'),
('Movie Pods', 'Private movie viewing pods', 250, '#f59e0b'),
('Internet', 'Internet browsing stations', 30, '#3b82f6');

-- Insert sample customers for testing (use real hashes in production!)
INSERT INTO customers (name, mobile, dob, email, password_hash) VALUES
('John Doe', '+1234567890', '1990-05-15', 'john@example.com', crypt('password123', gen_salt('bf'))),
('Jane Smith', '+0987654321', '1990-05-15', 'jane@example.com', crypt('password456', gen_salt('bf'))),
('Bob Johnson', '+1122334455', '1985-12-25', 'bob@example.com', crypt('password789', gen_salt('bf')));

-- Insert sample offers
INSERT INTO offers_promotions (title, description, discount_percent, valid_from, valid_until) VALUES
('Happy Hour Discount', '50% off on all gaming stations between 5 PM - 7 PM', 50, NOW(), NOW() + INTERVAL '30 days'),
('Student Special', 'Flat $10 discount for students with valid ID', null, NOW(), NOW() + INTERVAL '30 days');

-- Enable Row Level Security
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow all authenticated users for now - adjust as needed)
CREATE POLICY "Allow authenticated users to read roles" ON roles FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to read users" ON users FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to all operations on customers" ON customers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to all operations on verification_attempts" ON verification_attempts FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to all operations on audit_logs" ON audit_logs FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to all operations on otps" ON otps FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to all operations on offers_promotions" ON offers_promotions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to all operations on zones" ON zones FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to all operations on stations" ON stations FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to all operations on reservations" ON reservations FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to all operations on sessions" ON sessions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to all operations on session_logs" ON session_logs FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to all operations on menu_categories" ON menu_categories FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to all operations on menu_items" ON menu_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to all operations on orders" ON orders FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to all operations on order_items" ON order_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated users to all operations on payments" ON payments FOR ALL USING (auth.role() = 'authenticated');

-- Create function to handle updated_at
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_offers_promotions_updated_at BEFORE UPDATE ON offers_promotions FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_zones_updated_at BEFORE UPDATE ON zones FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_stations_updated_at BEFORE UPDATE ON stations FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_reservations_updated_at BEFORE UPDATE ON reservations FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_menu_categories_updated_at BEFORE UPDATE ON menu_categories FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
