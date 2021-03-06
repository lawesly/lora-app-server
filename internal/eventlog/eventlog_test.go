package eventlog

import (
	"context"
	"log"
	"testing"
	"time"

	. "github.com/smartystreets/goconvey/convey"

	"github.com/brocaar/lora-app-server/internal/config"
	"github.com/brocaar/lora-app-server/internal/storage"
	"github.com/brocaar/lora-app-server/internal/test"
	"github.com/brocaar/lorawan"
)

func TestEventLog(t *testing.T) {
	conf := test.GetConfig()
	p := storage.NewRedisPool(conf.RedisURL)
	config.C.Redis.Pool = p

	Convey("Given a clean Redis database", t, func() {
		test.MustFlushRedis(p)

		Convey("Testing GetEventLogForDevice", func() {
			devEUI := lorawan.EUI64{1, 2, 3, 4, 5, 6, 7, 8}
			logChannel := make(chan EventLog, 1)
			ctx := context.Background()
			cctx, cancel := context.WithCancel(ctx)
			defer cancel()

			go func() {
				if err := GetEventLogForDevice(cctx, devEUI, logChannel); err != nil {
					log.Fatal(err)
				}
			}()

			// some time to subscribe
			time.Sleep(time.Millisecond * 100)

			Convey("When calling LogEventForDevice", func() {
				el := EventLog{
					Type: Join,
				}

				So(LogEventForDevice(devEUI, el), ShouldBeNil)

				Convey("Then the event has been logged", func() {
					So(<-logChannel, ShouldResemble, EventLog{
						Type: Join,
					})
				})
			})
		})
	})
}
