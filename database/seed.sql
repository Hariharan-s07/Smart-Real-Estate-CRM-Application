-- database/seed.sql

-- Sample Users (Password is 'password123' for all, hashed with bcrypt 10 rounds)
INSERT INTO users (name, email, password, role) VALUES 
('Admin User', 'admin@crm.com', '$2b$10$O0O/H6k1lZJ/GkM90o7k1.iU7N8lJkK8I9w2l0MhT/XvM7O1F7mUq', 'ADMIN'),
('Sales One', 'sales1@crm.com', '$2b$10$O0O/H6k1lZJ/GkM90o7k1.iU7N8lJkK8I9w2l0MhT/XvM7O1F7mUq', 'SALES_EMPLOYEE'),
('Sales Two', 'sales2@crm.com', '$2b$10$O0O/H6k1lZJ/GkM90o7k1.iU7N8lJkK8I9w2l0MhT/XvM7O1F7mUq', 'SALES_EMPLOYEE');

-- Sample Projects
INSERT INTO projects (project_name, location, description) VALUES 
('Green Valley Residency', 'North Avenue, Sector 5', 'Premium residential complex with greenery.'),
('Urban Heights', 'Downtown Metro', 'High-rise luxury apartments.');

-- Sample Buildings
INSERT INTO buildings (project_id, building_name, floors) VALUES 
(1, 'Tower A', 10),
(1, 'Tower B', 12),
(2, 'Skyline Tower', 25);

-- Sample Units
INSERT INTO units (building_id, unit_number, floor, unit_type, area, price, status) VALUES 
(1, 'A101', 1, '2 BHK', 1200.00, 5000000.00, 'Available'),
(1, 'A102', 1, '2 BHK', 1250.00, 5200000.00, 'Available'),
(1, 'A201', 2, '3 BHK', 1500.00, 6500000.00, 'Available'),
(2, 'B101', 1, '2 BHK', 1200.00, 5000000.00, 'Available'),
(2, 'B102', 1, '3 BHK', 1600.00, 7000000.00, 'Blocked'),
(3, 'S101', 10, 'Penthouse', 3000.00, 15000000.00, 'Available');

-- Sample Leads
INSERT INTO leads (lead_code, customer_name, phone, email, lead_source, requirement, budget, assigned_employee_id, stage) VALUES 
('LD-1001', 'John Doe', '9876543210', 'john@example.com', 'Website', 'Looking for 2 BHK', 5500000.00, 2, 'New'),
('LD-1002', 'Jane Smith', '9876543211', 'jane@example.com', 'Referral', '3 BHK preferred', 7000000.00, 3, 'Contacted'),
('LD-1003', 'Mike Ross', '9876543212', 'mike@example.com', 'Walk-in', 'Penthouse', 20000000.00, 2, 'Site Visit');

-- Sample Follow-up
INSERT INTO lead_activities (lead_id, activity_type, activity_date, notes, status, created_by) VALUES 
(1, 'Phone Call', datetime('now', '+1 day'), 'Follow up on 2BHK requirement', 'Scheduled', 2),
(2, 'Site Visit', datetime('now', '-1 day'), 'Missed site visit', 'Overdue', 3);
