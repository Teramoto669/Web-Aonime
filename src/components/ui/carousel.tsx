"use client"

import * as React from "react"
import useEmblaCarousel, {
  type UseEmblaCarouselType,
} from "embla-carousel-react"
import { ArrowLeft, ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

type CarouselApi = UseEmblaCarouselType[1]
type UseCarouselParameters = Parameters<typeof useEmblaCarousel>
type CarouselOptions = UseCarouselParameters[0]
type CarouselPlugin = UseCarouselParameters[1]

type CarouselProps = {
  opts?: CarouselOptions
  plugins?: CarouselPlugin
  orientation?: "horizontal" | "vertical"
  setApi?: (api: CarouselApi) => void
}

type CarouselContextProps = {
  carouselRef: ReturnType<typeof useEmblaCarousel>[0]
  api: ReturnType<typeof useEmblaCarousel>[1]
  scrollPrev: () => void
  scrollNext: () => void
  canScrollPrev: boolean
  canScrollNext: boolean
  isScrolling: boolean
} & CarouselProps

const CarouselContext = React.createContext<CarouselContextProps | null>(null)

function useCarousel() {
  const context = React.useContext(CarouselContext)

  if (!context) {
    throw new Error("useCarousel must be used within a <Carousel />")
  }

  return context
}

const Carousel = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & CarouselProps
>(
  (
    {
      orientation = "horizontal",
      opts,
      setApi,
      plugins,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const [carouselRef, api] = useEmblaCarousel(
      {
        ...opts,
        axis: orientation === "horizontal" ? "x" : "y",
      },
      plugins
    )
    const [canScrollPrev, setCanScrollPrev] = React.useState(false)
    const [canScrollNext, setCanScrollNext] = React.useState(false)
    const isScrollingRef = React.useRef(false)

    const onSelect = React.useCallback((api: CarouselApi) => {
      if (!api) {
        return
      }

      setCanScrollPrev(api.canScrollPrev())
      setCanScrollNext(api.canScrollNext())
    }, [])

    const scrollPrev = React.useCallback(() => {
      api?.scrollPrev()
    }, [api])

    const scrollNext = React.useCallback(() => {
      api?.scrollNext()
    }, [api])

    const handleKeyDown = React.useCallback(
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault()
          scrollPrev()
        } else if (event.key === "ArrowRight") {
          event.preventDefault()
          scrollNext()
        }
      },
      [scrollPrev, scrollNext]
    )

    React.useEffect(() => {
      if (!api || !setApi) {
        return
      }

      setApi(api)
    }, [api, setApi])

    React.useEffect(() => {
      if (!api) {
        return
      }

      const rootNode = api.rootNode()
      if (rootNode) {
        ;(rootNode as any).__emblaApi = api
      }

      onSelect(api)
      api.on("reInit", onSelect)
      api.on("select", onSelect)
      api.on("settle", onSelect)

      return () => {
        api.off("reInit", onSelect)
        api.off("select", onSelect)
        api.off("settle", onSelect)
      }
    }, [api, onSelect])

    React.useEffect(() => {
      if (!api) {
        return
      }

      const handleScrollStart = () => {
        if (!isScrollingRef.current) {
          isScrollingRef.current = true
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("carousel-scroll", { detail: { scrolling: true } })
            )
          }
        }
      }

      const handleScrollEnd = () => {
        if (isScrollingRef.current) {
          isScrollingRef.current = false
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("carousel-scroll", { detail: { scrolling: false } })
            )
          }
        }
      }

      api.on("pointerDown", handleScrollStart)
      api.on("scroll", handleScrollStart)
      api.on("settle", handleScrollEnd)

      return () => {
        api.off("pointerDown", handleScrollStart)
        api.off("scroll", handleScrollStart)
        api.off("settle", handleScrollEnd)
      }
    }, [api])

    const internalRef = React.useRef<HTMLDivElement | null>(null)
    React.useImperativeHandle(ref, () => internalRef.current as HTMLDivElement)

    const wheelAccumulatorRef = React.useRef(0)
    const wheelTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

    React.useEffect(() => {
      const element = internalRef.current
      if (!element || !api) return

      const handleWheel = (event: WheelEvent) => {
        const isHorizontal = Math.abs(event.deltaX) > Math.abs(event.deltaY)
        if (!event.shiftKey && !isHorizontal) return

        const rawDelta = isHorizontal ? event.deltaX : event.deltaY || event.deltaX
        if (rawDelta === 0) return

        const multiplier =
          event.deltaMode === 1 ? 32 : event.deltaMode === 2 ? 300 : 1
        const delta = rawDelta * multiplier

        const engine = api.internalEngine()
        if (engine.options.dragFree && !engine.options.loop) {
          const currentTarget = engine.target.get()
          const canGoNext = currentTarget > engine.limit.min + 0.5
          const canGoPrev = currentTarget < engine.limit.max - 0.5
          if ((delta > 0 && !canGoNext) || (delta < 0 && !canGoPrev)) {
            return
          }

          event.preventDefault()

          const nextTarget = engine.limit.constrain(currentTarget - delta * 1.5)
          const distance = nextTarget - currentTarget
          if (distance !== 0) {
            engine.scrollBody.useDuration(15).useBaseFriction()
            engine.scrollTo.distance(distance, false)
          }
          return
        }

        if (
          (delta > 0 && !api.canScrollNext()) ||
          (delta < 0 && !api.canScrollPrev())
        ) {
          return
        }

        event.preventDefault()

        if (wheelTimeoutRef.current) {
          clearTimeout(wheelTimeoutRef.current)
        }
        wheelTimeoutRef.current = setTimeout(() => {
          wheelAccumulatorRef.current = 0
        }, 200)

        wheelAccumulatorRef.current += delta

        const threshold = 40
        if (wheelAccumulatorRef.current >= threshold) {
          api.scrollNext()
          wheelAccumulatorRef.current = 0
        } else if (wheelAccumulatorRef.current <= -threshold) {
          api.scrollPrev()
          wheelAccumulatorRef.current = 0
        }
      }

      element.addEventListener("wheel", handleWheel, { passive: false })
      return () => {
        element.removeEventListener("wheel", handleWheel)
        if (wheelTimeoutRef.current) {
          clearTimeout(wheelTimeoutRef.current)
        }
      }
    }, [api])

    return (
      <CarouselContext.Provider
        value={{
          carouselRef,
          api: api,
          opts,
          orientation:
            orientation || (opts?.axis === "y" ? "vertical" : "horizontal"),
          scrollPrev,
          scrollNext,
          canScrollPrev,
          canScrollNext,
          isScrolling: isScrollingRef.current,
        }}
      >
        <div
          ref={internalRef}
          onKeyDownCapture={handleKeyDown}
          className={cn("relative", className)}
          role="region"
          aria-roledescription="carousel"
          {...props}
        >
          {children}
        </div>
      </CarouselContext.Provider>
    )
  }
)
Carousel.displayName = "Carousel"

const CarouselContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { carouselRef, orientation } = useCarousel()

  return (
    <div
      ref={carouselRef}
      data-carousel-viewport="true"
      onDragStart={(e) => e.preventDefault()}
      className="overflow-hidden select-none cursor-grab active:cursor-grabbing touch-pan-y"
    >
      <div
        ref={ref}
        className={cn(
          "flex",
          orientation === "horizontal" ? "-ml-4" : "-mt-4 flex-col",
          className
        )}
        {...props}
      />
    </div>
  )
})
CarouselContent.displayName = "CarouselContent"

const CarouselItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { orientation } = useCarousel()

  return (
    <div
      ref={ref}
      role="group"
      aria-roledescription="slide"
      className={cn(
        "min-w-0 shrink-0 grow-0 basis-full",
        orientation === "horizontal" ? "pl-4" : "pt-4",
        className
      )}
      {...props}
    />
  )
})
CarouselItem.displayName = "CarouselItem"

const CarouselPrevious = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, variant = "outline", size = "icon", ...props }, ref) => {
  const { orientation, scrollPrev, canScrollPrev } = useCarousel()

  return (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      className={cn(
        "absolute  h-8 w-8 rounded-full",
        orientation === "horizontal"
          ? "-left-12 top-1/2 -translate-y-1/2"
          : "-top-12 left-1/2 -translate-x-1/2 rotate-90",
        className
      )}
      disabled={!canScrollPrev}
      onClick={scrollPrev}
      {...props}
    >
      <ArrowLeft className="h-4 w-4" />
      <span className="sr-only">Previous slide</span>
    </Button>
  )
})
CarouselPrevious.displayName = "CarouselPrevious"

const CarouselNext = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<typeof Button>
>(({ className, variant = "outline", size = "icon", ...props }, ref) => {
  const { orientation, scrollNext, canScrollNext } = useCarousel()

  return (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      className={cn(
        "absolute h-8 w-8 rounded-full",
        orientation === "horizontal"
          ? "-right-12 top-1/2 -translate-y-1/2"
          : "-bottom-12 left-1/2 -translate-x-1/2 rotate-90",
        className
      )}
      disabled={!canScrollNext}
      onClick={scrollNext}
      {...props}
    >
      <ArrowRight className="h-4 w-4" />
      <span className="sr-only">Next slide</span>
    </Button>
  )
})
CarouselNext.displayName = "CarouselNext"

export {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
}
