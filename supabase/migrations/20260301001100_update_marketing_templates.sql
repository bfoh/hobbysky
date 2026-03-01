-- Update marketing templates to use Hobbysky Guest House branding and premium messaging

-- Holiday Special (SMS)
UPDATE marketing_templates 
SET content = 'Hi {{name}}! 🎄 This holiday season, treat yourself to the comfort of Hobbysky Guest House. Limited rooms. Premium serenity awaits. Book now: https://hobbyskyguesthouse.com'
WHERE name = 'Holiday Special (SMS)';

-- Holiday Special (Email)  
UPDATE marketing_templates
SET content = '<div style="font-family: ''Segoe UI'', Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #1a3a2a 0%, #2d5a3e 100%); padding: 40px 30px; text-align: center; border-radius: 0 0 24px 24px;">
    <h1 style="color: #d4a017; font-size: 32px; margin: 0;">🎄 Holiday Special</h1>
    <p style="color: rgba(255,255,255,0.8); margin-top: 8px;">Exclusive rates just for you, {{name}}</p>
  </div>
  <div style="padding: 30px;">
    <p style="font-size: 16px; line-height: 1.6;">Dear {{name}},</p>
    <p style="font-size: 16px; line-height: 1.6;">This holiday season, escape to the serene comfort of <strong style="color: #1a3a2a;">Hobbysky Guest House</strong>. Celebrate the festivities in style with our premium rooms, exceptional dining, and warm hospitality.</p>
    <div style="background: linear-gradient(135deg, #f8f6f0 0%, #f0ebe0 100%); padding: 24px; border-left: 4px solid #d4a017; margin: 24px 0; border-radius: 0 12px 12px 0;">
      <p style="margin: 0; font-size: 18px; font-weight: 700; color: #1a3a2a;">🌟 Limited Rooms Available</p>
      <p style="margin: 8px 0 0; color: #666;">Don''t miss out on exclusive holiday rates. Book early for the best selection.</p>
    </div>
    <div style="text-align: center; margin: 32px 0;">
      <a href="https://hobbyskyguesthouse.com" style="background: linear-gradient(135deg, #d4a017 0%, #b8860b 100%); color: white; padding: 14px 36px; text-decoration: none; border-radius: 50px; display: inline-block; font-weight: 700; font-size: 15px;">Reserve Your Holiday Stay →</a>
    </div>
    <p style="font-size: 12px; color: #999; text-align: center;">Hobbysky Guest House Ltd • Cape Coast, Ghana</p>
  </div>
</div>',
subject = '🎄 Holiday Special — Exclusive Rates at Hobbysky Guest House'
WHERE name = 'Holiday Special (Email)';

-- Seasonal Discount (SMS)
UPDATE marketing_templates
SET content = 'Hi {{name}}! ☀️ Special Offer from Hobbysky Guest House. Use code SEASON15 for 15% off your next booking. Limited time! Book: https://hobbyskyguesthouse.com'
WHERE name = 'Seasonal Discount (SMS)';

-- Seasonal Discount (Email)
UPDATE marketing_templates 
SET content = '<div style="font-family: ''Segoe UI'', Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto;">
  <div style="background: linear-gradient(135deg, #1a3a2a 0%, #2d5a3e 100%); padding: 40px 30px; text-align: center; border-radius: 0 0 24px 24px;">
    <h1 style="color: #d4a017; font-size: 32px; margin: 0;">☀️ Seasonal Offer</h1>
    <p style="color: rgba(255,255,255,0.8); margin-top: 8px;">An exclusive discount for valued guests</p>
  </div>
  <div style="padding: 30px;">
    <p style="font-size: 16px; line-height: 1.6;">Hello {{name}},</p>
    <p style="font-size: 16px; line-height: 1.6;">As a valued guest, we''d love to welcome you back to <strong style="color: #1a3a2a;">Hobbysky Guest House</strong> with an exclusive seasonal discount.</p>
    <div style="background: linear-gradient(135deg, #1a3a2a 0%, #2d5a3e 100%); padding: 24px; text-align: center; margin: 24px 0; border-radius: 16px;">
      <p style="margin: 0; color: #d4a017; font-size: 14px; text-transform: uppercase; letter-spacing: 2px;">Your Promo Code</p>
      <p style="margin: 8px 0; color: white; font-size: 36px; font-weight: 800; letter-spacing: 4px;">SEASON15</p>
      <p style="margin: 0; color: rgba(255,255,255,0.7); font-size: 14px;">15% off your next stay</p>
    </div>
    <div style="text-align: center; margin: 32px 0;">
      <a href="https://hobbyskyguesthouse.com" style="background: linear-gradient(135deg, #d4a017 0%, #b8860b 100%); color: white; padding: 14px 36px; text-decoration: none; border-radius: 50px; display: inline-block; font-weight: 700; font-size: 15px;">Book Now & Save →</a>
    </div>
    <p style="font-size: 12px; color: #999; text-align: center;">Hobbysky Guest House Ltd • Cape Coast, Ghana</p>
  </div>
</div>',
subject = '☀️ 15% Off Your Next Stay — Hobbysky Guest House'
WHERE name = 'Seasonal Discount (Email)';

-- Update any remaining templates that mention AMP Lodge
UPDATE marketing_templates
SET content = REPLACE(content, 'AMP Lodge', 'Hobbysky Guest House')
WHERE content LIKE '%AMP Lodge%';

UPDATE marketing_templates
SET content = REPLACE(content, 'amplodge.com', 'hobbyskyguesthouse.com')
WHERE content LIKE '%amplodge.com%';

UPDATE marketing_templates
SET content = REPLACE(content, 'amplodge.org', 'hobbyskyguesthouse.com')
WHERE content LIKE '%amplodge.org%';

UPDATE marketing_templates
SET subject = REPLACE(subject, 'AMP Lodge', 'Hobbysky Guest House')
WHERE subject LIKE '%AMP Lodge%';
