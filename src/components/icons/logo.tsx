
import type { SVGProps } from 'react';

export function CodeCampusLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="none"
      {...props}
    >
      <path d="M8.5 8.62v6.76L5.45 12 8.5 8.62zM15.5 15.38V8.62L18.55 12l-3.05 3.38zM10.41 7.12L3.5 12l6.91 4.88L13.59 18l-9.19-6 9.19-6-3.18-1.12z" />
    </svg>
  );
}
