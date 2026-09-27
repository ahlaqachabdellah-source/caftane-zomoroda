-- ============================================================================
-- Seed data — Moroccan Caftan Rental
-- Phase 1 development dataset. Reference content only; the admin dashboard
-- (later phase) manages real catalog data.
--
-- NOTE: caftan_images.storage_path values below are placeholders following
-- the convention 'seed/<slug>-<n>.jpg'. Real photos are uploaded to the
-- 'caftan-images' bucket during content entry.
-- ============================================================================

-- --------------------------------------------------------------------------
-- Categories
-- --------------------------------------------------------------------------
insert into public.categories (id, slug, name, description, sort_order) values
  ('10000000-0000-0000-0000-000000000001', 'caftan',
   '{"ar": "قفطان", "fr": "Caftan", "en": "Caftan"}',
   '{"ar": "قفطان مغربي تقليدي بقطعة واحدة", "fr": "Le caftan marocain traditionnel en une pièce", "en": "The traditional one-piece Moroccan caftan"}',
   1),
  ('10000000-0000-0000-0000-000000000002', 'takchita',
   '{"ar": "تكشيطة", "fr": "Takchita", "en": "Takchita"}',
   '{"ar": "تكشيطة من قطعتين بأناقة ملكية", "fr": "La takchita deux pièces, élégance royale", "en": "The two-piece takchita, royal elegance"}',
   2),
  ('10000000-0000-0000-0000-000000000003', 'jellaba',
   '{"ar": "جلابة", "fr": "Jellaba", "en": "Jellaba"}',
   '{"ar": "جلابة عصرية ومريحة لجميع المناسبات", "fr": "La jellaba moderne et confortable pour toutes les occasions", "en": "The modern, comfortable jellaba for every occasion"}',
   3);

-- --------------------------------------------------------------------------
-- Caftans (8 available / 1 maintenance / 1 retired)
-- --------------------------------------------------------------------------
insert into public.caftans
  (id, slug, category_id, name, description, size, color, price_per_day, deposit_amount, status, featured) values
  ('20000000-0000-0000-0000-000000000001', 'caftan-andalou-rouge', '10000000-0000-0000-0000-000000000001',
   '{"ar": "قفطان أندلسي أحمر", "fr": "Caftan Andalou Rouge", "en": "Red Andalusian Caftan"}',
   '{"ar": "قفطان أندلسي بتطريز يدوي فاخر وخيوط ذهبية.", "fr": "Caftan andalou avec broderie main raffinée et fils dorés.", "en": "Andalusian caftan with refined hand embroidery and golden threads."}',
   'M', 'Rouge', 800.00, 2000.00, 'available', true),
  ('20000000-0000-0000-0000-000000000002', 'takchita-royale-doree', '10000000-0000-0000-0000-000000000002',
   '{"ar": "تكشيطة ملكية ذهبية", "fr": "Takchita Royale Dorée", "en": "Golden Royal Takchita"}',
   '{"ar": "تكشيطة فاخرة من قطعتين بقماش المخمل والتطريز الذهبي.", "fr": "Takchita deux pièces luxueuse en velours avec broderie dorée.", "en": "Luxurious two-piece velvet takchita with golden embroidery."}',
   'S', 'Doré', 1200.00, 3000.00, 'available', true),
  ('20000000-0000-0000-0000-000000000003', 'caftan-bleu-roi', '10000000-0000-0000-0000-000000000001',
   '{"ar": "قفطان أزرق ملكي", "fr": "Caftan Bleu Roi", "en": "Royal Blue Caftan"}',
   '{"ar": "قفطان أزرق ملكي بأزرار العقيق وحزام مطرز.", "fr": "Caftan bleu roi avec boutons en pierres fines et ceinture brodée.", "en": "Royal blue caftan with gemstone buttons and embroidered belt."}',
   'L', 'Bleu roi', 700.00, 1800.00, 'available', false),
  ('20000000-0000-0000-0000-000000000004', 'jellaba-ivoire-brodee', '10000000-0000-0000-0000-000000000003',
   '{"ar": "جلابة عاجية مطرزة", "fr": "Jellaba Ivoire Brodée", "en": "Embroidered Ivory Jellaba"}',
   '{"ar": "جلابة عاجية خفيفة بتطريز دقيق عند الصدر والأكمام.", "fr": "Jellaba ivoire légère avec broderie fine au buste et aux manches.", "en": "Light ivory jellaba with fine embroidery on chest and sleeves."}',
   'Taille unique', 'Ivoire', 400.00, 1000.00, 'available', false),
  ('20000000-0000-0000-0000-000000000005', 'takchita-vert-emeraude', '10000000-0000-0000-0000-000000000002',
   '{"ar": "تكشيطة خضراء زمردية", "fr": "Takchita Vert Émeraude", "en": "Emerald Green Takchita"}',
   '{"ar": "تكشيطة زمردية بحرير طبيعي وتفاصيل فضية.", "fr": "Takchita émeraude en soie naturelle et détails argentés.", "en": "Emerald takchita in natural silk with silver details."}',
   'M', 'Vert émeraude', 1100.00, 2500.00, 'available', true),
  ('20000000-0000-0000-0000-000000000006', 'caftan-rose-poudre', '10000000-0000-0000-0000-000000000001',
   '{"ar": "قفطان وردي بودري", "fr": "Caftan Rose Poudré", "en": "Powder Pink Caftan"}',
   '{"ar": "قفطان وردي ناعم مثالي للخطوبة والمناسبات النهارية.", "fr": "Caftan rose poudré doux, idéal pour fiançailles et réceptions de jour.", "en": "Soft powder pink caftan, ideal for engagements and daytime events."}',
   'S', 'Rose poudré', 650.00, 1500.00, 'available', false),
  ('20000000-0000-0000-0000-000000000007', 'caftan-bordeaux-perle', '10000000-0000-0000-0000-000000000001',
   '{"ar": "قفطان عنابي مزين باللؤلؤ", "fr": "Caftan Bordeaux Perlé", "en": "Pearled Burgundy Caftan"}',
   '{"ar": "قفطان عنابي فاخر مزين بحبات اللؤلؤ يدوياً.", "fr": "Caftan bordeaux luxueux orné de perles cousues main.", "en": "Luxurious burgundy caftan adorned with hand-sewn pearls."}',
   'M', 'Bordeaux', 900.00, 2200.00, 'available', true),
  ('20000000-0000-0000-0000-000000000008', 'takchita-noire-et-or', '10000000-0000-0000-0000-000000000002',
   '{"ar": "تكشيطة سوداء وذهبية", "fr": "Takchita Noire et Or", "en": "Black and Gold Takchita"}',
   '{"ar": "تكشيطة سوداء أنيقة بلمسات ذهبية للسهرات.", "fr": "Takchita noire élégante aux touches dorées pour les soirées.", "en": "Elegant black takchita with golden touches for evening events."}',
   'L', 'Noir et or', 1000.00, 2500.00, 'available', false),
  ('20000000-0000-0000-0000-000000000009', 'caftan-blanc-mariee', '10000000-0000-0000-0000-000000000001',
   '{"ar": "قفطان أبيض للعروس", "fr": "Caftan Blanc Mariée", "en": "Bridal White Caftan"}',
   '{"ar": "قفطان أبيض فاخر مخصص للعرائس، قيد الصيانة حالياً.", "fr": "Caftan blanc haute couture dédié aux mariées, actuellement en entretien.", "en": "Haute couture white bridal caftan, currently under maintenance."}',
   'M', 'Blanc', 1800.00, 4000.00, 'maintenance', false),
  ('20000000-0000-0000-0000-000000000010', 'jellaba-saumon', '10000000-0000-0000-0000-000000000003',
   '{"ar": "جلابة سالمونية", "fr": "Jellaba Saumon", "en": "Salmon Jellaba"}',
   '{"ar": "جلابة سالمونية كلاسيكية، خارجة من الكتالوج.", "fr": "Jellaba saumon classique, retirée du catalogue.", "en": "Classic salmon jellaba, retired from the catalogue."}',
   'Taille unique', 'Saumon', 350.00, 800.00, 'retired', false);

-- --------------------------------------------------------------------------
-- Caftan images (placeholder storage paths)
-- --------------------------------------------------------------------------
insert into public.caftan_images (caftan_id, storage_path, alt_text, sort_order, is_primary) values
  ('20000000-0000-0000-0000-000000000001', 'seed/caftan-andalou-rouge-1.jpg',
   '{"ar": "قفطان أندلسي أحمر - الواجهة", "fr": "Caftan Andalou Rouge — vue de face", "en": "Red Andalusian Caftan — front view"}', 1, true),
  ('20000000-0000-0000-0000-000000000001', 'seed/caftan-andalou-rouge-2.jpg',
   '{"ar": "قفطان أندلسي أحمر - تفاصيل التطريز", "fr": "Caftan Andalou Rouge — détail de la broderie", "en": "Red Andalusian Caftan — embroidery detail"}', 2, false),
  ('20000000-0000-0000-0000-000000000002', 'seed/takchita-royale-doree-1.jpg',
   '{"ar": "تكشيطة ملكية ذهبية - الواجهة", "fr": "Takchita Royale Dorée — vue de face", "en": "Golden Royal Takchita — front view"}', 1, true),
  ('20000000-0000-0000-0000-000000000002', 'seed/takchita-royale-doree-2.jpg',
   '{"ar": "تكشيطة ملكية ذهبية - منظر خلفي", "fr": "Takchita Royale Dorée — vue de dos", "en": "Golden Royal Takchita — back view"}', 2, false),
  ('20000000-0000-0000-0000-000000000003', 'seed/caftan-bleu-roi-1.jpg',
   '{"ar": "قفطان أزرق ملكي - الواجهة", "fr": "Caftan Bleu Roi — vue de face", "en": "Royal Blue Caftan — front view"}', 1, true),
  ('20000000-0000-0000-0000-000000000003', 'seed/caftan-bleu-roi-2.jpg',
   '{"ar": "قفطان أزرق ملكي - الحزام", "fr": "Caftan Bleu Roi — ceinture", "en": "Royal Blue Caftan — belt"}', 2, false),
  ('20000000-0000-0000-0000-000000000004', 'seed/jellaba-ivoire-brodee-1.jpg',
   '{"ar": "جلابة عاجية مطرزة", "fr": "Jellaba Ivoire Brodée", "en": "Embroidered Ivory Jellaba"}', 1, true),
  ('20000000-0000-0000-0000-000000000005', 'seed/takchita-vert-emeraude-1.jpg',
   '{"ar": "تكشيطة خضراء زمردية", "fr": "Takchita Vert Émeraude", "en": "Emerald Green Takchita"}', 1, true),
  ('20000000-0000-0000-0000-000000000006', 'seed/caftan-rose-poudre-1.jpg',
   '{"ar": "قفطان وردي بودري", "fr": "Caftan Rose Poudré", "en": "Powder Pink Caftan"}', 1, true),
  ('20000000-0000-0000-0000-000000000007', 'seed/caftan-bordeaux-perle-1.jpg',
   '{"ar": "قفطان عنابي مزين باللؤلؤ", "fr": "Caftan Bordeaux Perlé", "en": "Pearled Burgundy Caftan"}', 1, true),
  ('20000000-0000-0000-0000-000000000008', 'seed/takchita-noire-et-or-1.jpg',
   '{"ar": "تكشيطة سوداء وذهبية", "fr": "Takchita Noire et Or", "en": "Black and Gold Takchita"}', 1, true),
  ('20000000-0000-0000-0000-000000000009', 'seed/caftan-blanc-mariee-1.jpg',
   '{"ar": "قفطان أبيض للعروس", "fr": "Caftan Blanc Mariée", "en": "Bridal White Caftan"}', 1, true),
  ('20000000-0000-0000-0000-000000000010', 'seed/jellaba-saumon-1.jpg',
   '{"ar": "جلابة سالمونية", "fr": "Jellaba Saumon", "en": "Salmon Jellaba"}', 1, true);

-- --------------------------------------------------------------------------
-- Site settings (singleton).
-- Address / opening hours / plus code are the REAL business information
-- provided by the owner (final audit). Phone, WhatsApp, email and social
-- links remain placeholders to replace during content entry — the footer
-- omits empty fields automatically.
-- --------------------------------------------------------------------------
insert into public.site_settings
  (id, whatsapp_number, phone, email, address, opening_hours, plus_code, social_links, seo_defaults) values
  (1,
   '+212600000000',
   '+212500000000',
   'contact@example.com',
   '{"ar": "قسارية الخليل رقم 29 أولاد تايمة (هوارة)", "fr": "Quissariat Al Khalil n° 29, Oulad Teima (Houara), Maroc", "en": "Quissariat Al Khalil No. 29, Oulad Teima (Houara), Morocco"}',
   '10:00–20:00',
   '9QVP+M8G',
   '{"instagram": "", "facebook": "", "tiktok": ""}',
   '{
      "ar": {"title": "تأجير قفطان مغربي", "description": "تأجير قفطان وتكشيطة فاخرة لجميع المناسبات"},
      "fr": {"title": "Location de Caftan Marocain", "description": "Location de caftans et takchitas de luxe pour toutes vos occasions"},
      "en": {"title": "Moroccan Caftan Rental", "description": "Luxury caftan and takchita rental for every occasion"}
    }');
