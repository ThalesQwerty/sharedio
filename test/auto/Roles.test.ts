import { UserRoles } from "../../lib/schema";

jest.setTimeout(1000);

describe("Roles", () => {
    it("Tests permissions correctly", (done) => {
        const results:[string[], string, boolean][] = [
            [["all"], "", false],
            [["all"], "(all)", true],
            [["all", "owner"], "(all)", true],
            [["all"], "(owner)", false],
            [["all", "owner"], "(all)", true],
            [["all"], "!(owner)", true],
            [["all", "owner"], "!(owner)", false],
            [["all"], "(owner)|(inside)", false],
            [["all", "owner"], "(owner)|(inside)", true],
            [["all", "inside"], "(owner)|(inside)", true],
            [["all", "owner", "inside"], "(owner)|(inside)", true],
            [["all"], "(owner)&(inside)", false],
            [["all", "owner"], "(owner)&(inside)", false],
            [["all", "inside"], "(owner)&(inside)", false],
            [["all", "owner", "inside"], "(owner)&(inside)", true],
            [[], "(all)", false],
        ];

        results.forEach(([userRoles, expression, expectedResult]) => {
            expect(UserRoles.test(userRoles, expression)).toBe(expectedResult);
        })

        done();
    })
});
