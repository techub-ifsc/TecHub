import { useEffect, useMemo, useRef, useState } from "react";

import "./CustomSelect.css";

export default function CustomSelect({
  id,
  name,
  value,
  options,
  placeholder = "Selecione uma opção",
  onChange,
  disabled = false,
  invalid = false,
  ariaDescribedBy,
  className = "",
}) {
  const containerRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const normalizedOptions = useMemo(
    () =>
      options.map((option) =>
        typeof option === "string"
          ? {
              value: option,
              label: option,
              disabled: false,
            }
          : {
              value: option.value,
              label: option.label,
              disabled: Boolean(option.disabled),
            },
      ),
    [options],
  );

  const selectedOption = normalizedOptions.find(
    (option) => option.value === value,
  );

  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick,
      );
    };
  }, []);

  useEffect(() => {
    if (disabled) {
      setOpen(false);
    }
  }, [disabled]);

  function findNextEnabledIndex(startIndex, direction) {
    let nextIndex = startIndex;

    for (
      let count = 0;
      count < normalizedOptions.length;
      count += 1
    ) {
      nextIndex =
        (nextIndex + direction + normalizedOptions.length) %
        normalizedOptions.length;

      if (!normalizedOptions[nextIndex]?.disabled) {
        return nextIndex;
      }
    }

    return startIndex;
  }

  function openOptions() {
    if (disabled) {
      return;
    }

    const selectedIndex = normalizedOptions.findIndex(
      (option) =>
        option.value === value && !option.disabled,
    );

    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  }

  function selectOption(option) {
    if (disabled || option.disabled) {
      return;
    }

    onChange?.({
      target: {
        name,
        value: option.value,
      },
    });

    setOpen(false);
  }

  function handleKeyDown(event) {
    if (disabled) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();

      if (!open) {
        openOptions();
        return;
      }

      setActiveIndex((currentIndex) =>
        findNextEnabledIndex(currentIndex, 1),
      );
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      if (!open) {
        openOptions();
        return;
      }

      setActiveIndex((currentIndex) =>
        findNextEnabledIndex(currentIndex, -1),
      );
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();

      if (!open) {
        openOptions();
        return;
      }

      const option = normalizedOptions[activeIndex];

      if (option) {
        selectOption(option);
      }
    }

    if (event.key === "Escape") {
      setOpen(false);
    }

    if (event.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div
      ref={containerRef}
      className={`custom-select ${
        open ? "is-open" : ""
      } ${invalid ? "is-invalid" : ""} ${
        disabled ? "is-disabled" : ""
      } ${className}`}
    >
      {name && (
        <input
          type="hidden"
          name={name}
          value={value}
        />
      )}

      <button
        id={id}
        type="button"
        className="custom-select__trigger"
        onClick={() => {
          if (open) {
            setOpen(false);
          } else {
            openOptions();
          }
        }}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-options`}
        aria-invalid={invalid}
        aria-describedby={ariaDescribedBy}
      >
        <span
          className={
            selectedOption
              ? "custom-select__value"
              : "custom-select__placeholder"
          }
        >
          {selectedOption?.label || placeholder}
        </span>

        <i
          className="fa-solid fa-chevron-down"
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul
          id={`${id}-options`}
          className="custom-select__options"
          role="listbox"
          aria-labelledby={id}
        >
          {normalizedOptions.map((option, index) => {
            const selected = option.value === value;
            const active = index === activeIndex;

            return (
              <li
                key={`${option.value}-${index}`}
                role="option"
                aria-selected={selected}
              >
                <button
                  type="button"
                  className={`custom-select__option ${
                    selected ? "is-selected" : ""
                  } ${active ? "is-active" : ""}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) =>
                    event.preventDefault()
                  }
                  onClick={() => selectOption(option)}
                  disabled={option.disabled}
                  tabIndex={-1}
                >
                  <span>{option.label}</span>

                  {selected && (
                    <i
                      className="fa-solid fa-check"
                      aria-hidden="true"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}