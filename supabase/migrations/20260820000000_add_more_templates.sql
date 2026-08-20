-- Add more templates

insert into public.templates
(category, name, thumbnail, tier_required, structure)

values

(
'Business',
'Modern Corporate',
'/templates/business-modern.jpg',
'free',
'{
  "hero": true,
  "services": true,
  "about": true,
  "testimonials": true,
  "contact": true
}'::jsonb
),

(
'Portfolio',
'Creative Portfolio',
'/templates/portfolio-creative.jpg',
'free',
'{
  "hero": true,
  "projects": true,
  "about": true,
  "contact": true
}'::jsonb
),

(
'Restaurant',
'Modern Cafe',
'/templates/restaurant-cafe.jpg',
'starter',
'{
  "hero": true,
  "menu": true,
  "gallery": true,
  "reservation": true
}'::jsonb
),

(
'Agency',
'Digital Agency',
'/templates/agency-digital.jpg',
'starter',
'{
  "hero": true,
  "services": true,
  "portfolio": true,
  "contact": true
}'::jsonb
),

(
'Startup',
'AI Startup',
'/templates/startup-ai.jpg',
'pro',
'{
  "hero": true,
  "features": true,
  "pricing": true,
  "faq": true
}'::jsonb
),

(
'E-commerce',
'Fashion Store',
'/templates/ecommerce-fashion.jpg',
'starter',
'{
  "hero": true,
  "products": true,
  "categories": true,
  "reviews": true
}'::jsonb
);
