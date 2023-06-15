import React, { PropsWithChildren } from "react";

type Props = PropsWithChildren<{
  title?: string;
  description?: string;
}>;

export const Container = ({ title, description, children }: Props) => {
  return (
    <div className="border border-grey-20 rounded-rounded bg-white py-6 px-8 flex flex-col mb-base relative">
      <div>
        <div className="flex items-center justify-between">
          {title && (
            <h2 className="text-[24px] leading-9 font-semibold">{title}</h2>
          )}
        </div>
        {description && (
          <p className="text-sm text-gray-500 mt-2">{description}</p>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
};
