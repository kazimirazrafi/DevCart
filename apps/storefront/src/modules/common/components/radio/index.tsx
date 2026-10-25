const Radio = ({ checked, 'data-testid': dataTestId }: { checked: boolean, 'data-testid'?: string }) => {
  return (
    <>
      <button
        type="button"
        role="radio"
        aria-checked="true"
        data-state={checked ? "checked" : "unchecked"}
        className="group relative flex h-5 w-5 items-center justify-center outline-none"
        data-testid={dataTestId || 'radio-button'}
      >
        <div className="border border-ink/40 bg-stock group-hover:border-ink group-data-[state=checked]:border-riso-blue group-data-[state=checked]:bg-riso-blue group-disabled:border-ink/20 group-disabled:bg-ink/10 flex h-[14px] w-[14px] items-center justify-center rounded-full transition-colors">
          {checked && (
            <span
              data-state={checked ? "checked" : "unchecked"}
              className="group flex items-center justify-center"
            >
              <div className="bg-stock rounded-full h-1.5 w-1.5"></div>
            </span>
          )}
        </div>
      </button>
    </>
  )
}

export default Radio
