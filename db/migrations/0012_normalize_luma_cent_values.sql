WITH luma_cent_values AS (
  SELECT
    conversion_id,
    conversion_value::numeric AS cents_value
  FROM attribution_conversions
  WHERE conversion_value ~ '^-?[0-9]+(\.[0-9]+)?$'
    AND conversion_value::numeric >= 100
    AND conversion_value::numeric = ROUND(conversion_value::numeric)
    AND COALESCE(
      payload #>> '{data,event_ticket,currency}',
      payload #>> '{data,event_tickets,0,currency}',
      payload #>> '{data,event_ticket_orders,0,currency}'
    ) IS NOT NULL
    AND COALESCE(
      payload #>> '{data,event_ticket,amount}',
      payload #>> '{data,event_tickets,0,amount}',
      payload #>> '{data,event_ticket_orders,0,amount}'
    ) ~ '^-?[0-9]+(\.[0-9]+)?$'
    AND COALESCE(
      payload #>> '{data,event_ticket,amount}',
      payload #>> '{data,event_tickets,0,amount}',
      payload #>> '{data,event_ticket_orders,0,amount}'
    )::numeric = conversion_value::numeric
)
UPDATE attribution_conversions conversions
SET
  conversion_value = to_char(luma_cent_values.cents_value / 100, 'FM999999999990.00'),
  updated_at = now()
FROM luma_cent_values
WHERE conversions.conversion_id = luma_cent_values.conversion_id;
