-- Choices for the whole collection, in a single row. The currency is the one
-- the Spending page's amounts are in (an ISO 4217 code, "EUR", "USD"):
-- changing it shows the same amounts in another currency, it doesn't convert
-- them.

create table settings (
  id         integer primary key check (id = 1),
  currency   text not null default 'EUR' check (currency glob '[A-Z][A-Z][A-Z]'),
  created_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at text not null default (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

create trigger settings_set_updated_at
after update on settings
for each row
begin
  update settings
  set updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  where id = new.id;
end;

-- The row is always there: the app reads and changes it, never adds or
-- deletes one.
create trigger settings_keep_the_row
before delete on settings
begin
  select raise(abort, 'The settings can be changed, not deleted');
end;

insert into settings (id) values (1);
