const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Decentratwitter", function () {
  let decentratwitter;
  let deployer, user1, user2, users;
  let URI = "SampleURI";
  let postHash = "SampleHash";

  beforeEach(async () => {
    [deployer, user1, user2, ...users] = await ethers.getSigners();

    const DecentratwitterFactory = await ethers.getContractFactory(
      "Decentratwitter"
    );

    decentratwitter = await DecentratwitterFactory.deploy();

    await decentratwitter.connect(user1).mint(URI);
  });

  describe("Deployment", async () => {
    it("should track name and symbol", async () => {
      const nftName = "Decentratwitter";
      const nftSymbol = "DAPP";
      expect(await decentratwitter.name()).to.equal(nftName);
      expect(await decentratwitter.symbol()).to.equal(nftSymbol);
    });
  });

  describe("Minting NFTs", async () => {
    it("should track each minted NFT", async () => {
      expect(await decentratwitter.tokenCount()).to.equal(1);
      expect(await decentratwitter.balanceOf(user1.address)).to.equal(1);
      expect(await decentratwitter.tokenURI(1)).to.equal(URI);
      expect(await decentratwitter.profiles(user1.address)).to.equal(1);

      await decentratwitter.connect(user2).mint(URI);

      expect(await decentratwitter.tokenCount()).to.equal(2);
      expect(await decentratwitter.balanceOf(user2.address)).to.equal(1);
      expect(await decentratwitter.tokenURI(2)).to.equal(URI);
      expect(await decentratwitter.profiles(user2.address)).to.equal(2);
    });
  });

  describe("Setting profiles", async () => {
    it("should allow user to select which NFT they own to represent their profile", async () => {
      await decentratwitter.connect(user1).mint(URI);

      expect(await decentratwitter.profiles(user1.address)).to.equal(2);

      await decentratwitter.connect(user1).setProfile(1);

      expect(await decentratwitter.profiles(user1.address)).to.equal(1);

      await expect(
        decentratwitter.connect(user2).setProfile(2)
      ).to.be.revertedWith("Must own the NFT to have it as your profile!");
    });
  });

  describe("Uploading posts", async () => {
    it("should track posts uploaded by users who own an NFT", async () => {
      await expect(decentratwitter.connect(user1).uploadPost(postHash))
        .to.emit(decentratwitter, "PostCreated")
        .withArgs(1, postHash, 0, user1.address);

        const postCount = await decentratwitter.postCount()
        expect(postCount).to.be.equal(1);

        const post = await decentratwitter.posts(postCount)
        expect(post.id).to.equal(1)
        expect(post.hash).to.equal(postHash)
        expect(post.tipAmount).to.equal(0);
        expect(post.author).to.equal(user1.address)

        await expect(decentratwitter.connect(user2).uploadPost(postHash)).to.be.revertedWith("Must own a decentratwitter NFT to post")

        await expect(decentratwitter.connect(user1).uploadPost("")).to.be.revertedWith("Cannot pass an empty hash")
    });
  });

  describe("Tipping posts", async () => {
    it("should allow users to tip posts and track each posts tip amount", async () => {
      await decentratwitter.connect(user1).uploadPost(postHash);

      const initAuthorBalance = await ethers.provider.getBalance(user1.address);

      const tipAmount = ethers.utils.parseEther("1");

      await expect(
        decentratwitter.connect(user2).tipPostOwner(1, { value: tipAmount })
      )
        .to.emit(decentratwitter, "PostTipped")
        .withArgs(1, postHash, tipAmount, user1.address);

      const post = await decentratwitter.posts(1);

      expect(post.tipAmount).to.equal(tipAmount);

      const finalAuthorBalance = await ethers.provider.getBalance(
        user1.address
      );

      expect(finalAuthorBalance).to.equal(initAuthorBalance.add(tipAmount));

      await expect(
        decentratwitter.connect(user2).tipPostOwner(2)
      ).to.be.revertedWith("Invalid post id");

      await expect(
        decentratwitter.connect(user1).tipPostOwner(1)
      ).to.be.revertedWith("Cannot tip your own post!");
    });
  });
});
