interface DateTimeProps extends Intl.DateTimeFormatOptions {
  datetime: string | Date;
  locale?: Intl.LocalesArgument;
}

/**
 * Client-side date formatter component
 * Formats dates using the browser's Intl API with user's preferred locale
 */
export function DateTime({
  datetime,
  locale = undefined,
  ...options
}: DateTimeProps) {
  const date = new Date(datetime);

  return (
    <time dateTime={date.toISOString()}>
      {date.toLocaleString(locale, options)}
    </time>
  );
}
