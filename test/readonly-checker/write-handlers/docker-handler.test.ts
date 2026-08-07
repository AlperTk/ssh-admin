import { describe, it, expect } from "vitest";
import { dockerHasWriteArg } from "../../../src/readonly-checker/write-handlers/docker-handler.js";

describe("dockerHasWriteArg", () => {
  describe("read-only commands", () => {
    it("should allow docker ps", () => {
      expect(dockerHasWriteArg("docker ps")).toBe(false);
      expect(dockerHasWriteArg("docker ps -a")).toBe(false);
    });
    it("should allow docker images", () => {
      expect(dockerHasWriteArg("docker images")).toBe(false);
      expect(dockerHasWriteArg("docker images -a")).toBe(false);
    });
    it("should allow docker inspect", () => {
      expect(dockerHasWriteArg("docker inspect container1")).toBe(false);
    });
    it("should allow docker logs", () => {
      expect(dockerHasWriteArg("docker logs container1")).toBe(false);
      expect(dockerHasWriteArg("docker logs --tail 100 container1")).toBe(false);
      expect(dockerHasWriteArg("docker logs -f container1")).toBe(false);
    });
    it("should allow docker top/stats/version/info", () => {
      expect(dockerHasWriteArg("docker top container1")).toBe(false);
      expect(dockerHasWriteArg("docker stats container1")).toBe(false);
      expect(dockerHasWriteArg("docker version")).toBe(false);
      expect(dockerHasWriteArg("docker info")).toBe(false);
    });
    it("should allow docker diff/port/events", () => {
      expect(dockerHasWriteArg("docker diff container1")).toBe(false);
      expect(dockerHasWriteArg("docker port container1")).toBe(false);
      expect(dockerHasWriteArg("docker events")).toBe(false);
    });
    it("should block docker pull (disk write)", () => {
      expect(dockerHasWriteArg("docker pull ubuntu:latest")).toBe(true);
    });
    it("should allow docker ls commands", () => {
      expect(dockerHasWriteArg("docker config ls")).toBe(false);
      expect(dockerHasWriteArg("docker node ls")).toBe(false);
      expect(dockerHasWriteArg("docker service ls")).toBe(false);
      expect(dockerHasWriteArg("docker task ls")).toBe(false);
      expect(dockerHasWriteArg("docker volume ls")).toBe(false);
      expect(dockerHasWriteArg("docker network ls")).toBe(false);
      expect(dockerHasWriteArg("docker plugin ls")).toBe(false);
      expect(dockerHasWriteArg("docker secret ls")).toBe(false);
    });
    it("should allow docker swarm status", () => {
      expect(dockerHasWriteArg("docker swarm status")).toBe(false);
    });
    it("should allow docker container/image/system ls", () => {
      expect(dockerHasWriteArg("docker container ls")).toBe(false);
      expect(dockerHasWriteArg("docker image ls")).toBe(false);
      expect(dockerHasWriteArg("docker system df")).toBe(false);
    });
    it("should allow docker exec with read commands", () => {
      expect(dockerHasWriteArg("docker exec container1 cat /etc/os-release")).toBe(false);
      expect(dockerHasWriteArg("docker exec -it container1 cat /etc/os-release")).toBe(false);
    });
  });

  describe("write commands", () => {
    it("should block docker rm/rmi", () => {
      expect(dockerHasWriteArg("docker rm container1")).toBe(true);
      expect(dockerHasWriteArg("docker rmi image1")).toBe(true);
    });
    it("should block docker run", () => {
      expect(dockerHasWriteArg("docker run ubuntu bash")).toBe(true);
    });
    it("should block docker stop/start/restart/kill", () => {
      expect(dockerHasWriteArg("docker stop container1")).toBe(true);
      expect(dockerHasWriteArg("docker start container1")).toBe(true);
      expect(dockerHasWriteArg("docker restart container1")).toBe(true);
      expect(dockerHasWriteArg("docker kill container1")).toBe(true);
    });
    it("should block docker update/rename/tag/push", () => {
      expect(dockerHasWriteArg("docker update --memory 1G container1")).toBe(true);
      expect(dockerHasWriteArg("docker rename old new")).toBe(true);
      expect(dockerHasWriteArg("docker tag img repo/img")).toBe(true);
      expect(dockerHasWriteArg("docker push repo/img")).toBe(true);
    });
    it("should block docker save/import/export", () => {
      expect(dockerHasWriteArg("docker save img > file")).toBe(true);
      expect(dockerHasWriteArg("docker import file img")).toBe(true);
      expect(dockerHasWriteArg("docker export container > tar")).toBe(true);
    });
    it("should block docker commit/cp", () => {
      expect(dockerHasWriteArg("docker commit container img")).toBe(true);
      expect(dockerHasWriteArg("docker cp container:/file .")).toBe(true);
    });
    it("should block docker pause/unpause/build/create", () => {
      expect(dockerHasWriteArg("docker pause container1")).toBe(true);
      expect(dockerHasWriteArg("docker unpause container1")).toBe(true);
      expect(dockerHasWriteArg("docker build -t img .")).toBe(true);
      expect(dockerHasWriteArg("docker create ubuntu")).toBe(true);
    });
    it("should block docker system prune", () => {
      expect(dockerHasWriteArg("docker system prune")).toBe(true);
    });
    it("should block docker attach/wait", () => {
      expect(dockerHasWriteArg("docker attach container1")).toBe(true);
      expect(dockerHasWriteArg("docker wait container1")).toBe(true);
    });
    it("should block docker exec with write commands", () => {
      expect(dockerHasWriteArg("docker exec container1 touch /tmp/x")).toBe(true);
      expect(dockerHasWriteArg("docker exec container1 rm -rf /tmp/*")).toBe(true);
      expect(dockerHasWriteArg("docker exec container1 echo hello > /tmp/out")).toBe(true);
    });
  });
});
