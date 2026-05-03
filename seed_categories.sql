INSERT INTO categories (user_id, name, color, icon, type, is_system) VALUES
('user_2t1aGZZoXbN1KjY6f0fN8fX7uB1', 'Alimentación', '#10B981', 'shopping-cart', 'expense', 1),
('user_2t1aGZZoXbN1KjY6f0fN8fX7uB1', 'Vivienda', '#3B82F6', 'home', 'expense', 1),
('user_2t1aGZZoXbN1KjY6f0fN8fX7uB1', 'Transporte', '#F59E0B', 'car', 'expense', 1),
('user_2t1aGZZoXbN1KjY6f0fN8fX7uB1', 'Entretenimiento', '#8B5CF6', 'film', 'expense', 1),
('user_2t1aGZZoXbN1KjY6f0fN8fX7uB1', 'Salud', '#EF4444', 'heart', 'expense', 1),
('user_2t1aGZZoXbN1KjY6f0fN8fX7uB1', 'Educación', '#6366F1', 'book', 'expense', 1),
('user_2t1aGZZoXbN1KjY6f0fN8fX7uB1', 'Ropa', '#EC4899', 'shopping-bag', 'expense', 1),
('user_2t1aGZZoXbN1KjY6f0fN8fX7uB1', 'Mascotas', '#F97316', 'paw-print', 'expense', 1),
('user_2t1aGZZoXbN1KjY6f0fN8fX7uB1', 'Tecnología', '#64748B', 'laptop', 'expense', 1),
('user_2t1aGZZoXbN1KjY6f0fN8fX7uB1', 'Regalos', '#14B8A6', 'gift', 'expense', 1),
('user_2t1aGZZoXbN1KjY6f0fN8fX7uB1', 'Viajes', '#0EA5E9', 'plane', 'expense', 1),
('user_2t1aGZZoXbN1KjY6f0fN8fX7uB1', 'Ahorros', '#22C55E', 'piggy-bank', 'expense', 1),
('user_2t1aGZZoXbN1KjY6f0fN8fX7uB1', 'Suscripciones', '#8B5CF6', 'calendar', 'expense', 1),
('user_2t1aGZZoXbN1KjY6f0fN8fX7uB1', 'Deuda', '#EF4444', 'credit-card', 'expense', 1),
('user_2t1aGZZoXbN1KjY6f0fN8fX7uB1', 'Transferencias', '#6B7280', 'refresh-cw', 'expense', 1),
('user_2t1aGZZoXbN1KjY6f0fN8fX7uB1', 'Diezmo', '#8B5CF6', 'heart', 'expense', 1),
('user_2t1aGZZoXbN1KjY6f0fN8fX7uB1', 'Ofrendas', '#14B8A6', 'gift', 'expense', 1),
('user_2t1aGZZoXbN1KjY6f0fN8fX7uB1', 'Impuestos', '#F59E0B', 'landmark', 'expense', 1),
('user_2t1aGZZoXbN1KjY6f0fN8fX7uB1', 'Salario', '#10B981', 'briefcase', 'income', 1),
('user_2t1aGZZoXbN1KjY6f0fN8fX7uB1', 'Freelance', '#3B82F6', 'code', 'income', 1),
('user_2t1aGZZoXbN1KjY6f0fN8fX7uB1', 'Inversiones', '#8B5CF6', 'trending-up', 'income', 1),
('user_2t1aGZZoXbN1KjY6f0fN8fX7uB1', 'Otros ingresos', '#F59E0B', 'plus-circle', 'income', 1),
('user_2t1aGZZoXbN1KjY6f0fN8fX7uB1', 'Otros', '#9CA3AF', 'more-horizontal', 'expense', 1);

INSERT INTO settings (key, user_id, value) VALUES
('general', 'user_2t1aGZZoXbN1KjY6f0fN8fX7uB1', '{"baseCurrency":"USD","secondaryCurrency":"COP","trmSource":"banco_republica","manualTrm":4000,"manualEurToUsd":1.08,"ocrProvider":"claude","autoCategorize":true,"titheConfig":{"destination":"Iglesia Local","defaultTithe":10,"defaultOffering":5,"tithePercentByIncomeCategory":{}}}');
