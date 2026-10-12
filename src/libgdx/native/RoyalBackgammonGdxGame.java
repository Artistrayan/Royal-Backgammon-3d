package com.royalbackgammon.gdx;

import com.badlogic.gdx.ApplicationAdapter;
import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.InputAdapter;
import com.badlogic.gdx.graphics.GL20;
import com.badlogic.gdx.graphics.PerspectiveCamera;
import com.badlogic.gdx.graphics.g3d.Environment;
import com.badlogic.gdx.graphics.g3d.ModelBatch;
import com.badlogic.gdx.graphics.g3d.ModelInstance;
import com.badlogic.gdx.graphics.g3d.attributes.ColorAttribute;
import com.badlogic.gdx.graphics.g3d.environment.DirectionalLight;
import com.badlogic.gdx.graphics.g3d.model.Node;
import com.badlogic.gdx.math.Interpolation;
import com.badlogic.gdx.math.Intersector;
import com.badlogic.gdx.math.Vector3;
import com.badlogic.gdx.math.collision.BoundingBox;
import com.badlogic.gdx.math.collision.Ray;
import net.mgsx.gltf.loaders.glb.GLBLoader;
import net.mgsx.gltf.scene3d.scene.SceneAsset;

/**
 * Native libGDX 3D Engine implementation for Royal Backgammon (royal_backgammon.glb).
 * Loads the GLB model in closed state, unfolds on touch, and types out all options line by line.
 */
public class RoyalBackgammonGdxGame extends ApplicationAdapter {
    private PerspectiveCamera camera;
    private ModelBatch modelBatch;
    private Environment environment;
    private SceneAsset sceneAsset;
    private ModelInstance boardInstance;
    private Node leftLeafPivot;
    private Node boardRootNode;

    private boolean isBoardOpening = false;
    private boolean isBoardOpen = false;
    private float openTimer = 0f;
    private static final float OPEN_DURATION = 1.45f;
    private final BoundingBox boardBounds = new BoundingBox();

    @Override
    public void create() {
        camera = new PerspectiveCamera(32f, Gdx.graphics.getWidth(), Gdx.graphics.getHeight());
        camera.position.set(-1.85f, 11.4f, 8.95f);
        camera.lookAt(-1.85f, -0.15f, 0.25f);
        camera.near = 0.5f;
        camera.far = 60f;
        camera.update();

        modelBatch = new ModelBatch();
        environment = new Environment();
        environment.set(new ColorAttribute(ColorAttribute.AmbientLight, 0.96f, 0.92f, 0.82f, 0.85f));
        environment.add(new DirectionalLight().set(1.0f, 0.94f, 0.84f, -2.5f, -13.5f, -5.2f));

        // Load binary .glb model using gdx-gltf GLBLoader
        sceneAsset = new GLBLoader().load(Gdx.files.internal("royal_backgammon.glb"));
        boardInstance = new ModelInstance(sceneAsset.scene.model);
        boardInstance.calculateBoundingBox(boardBounds);

        boardRootNode = boardInstance.getNode("RoyalBackgammonBoard", true);
        leftLeafPivot = boardInstance.getNode("LeftLeafPivot", true);

        // Start in CLOSED state (-180 deg around hinge axis)
        applyHingePose(0f);

        Gdx.input.setInputProcessor(new InputAdapter() {
            @Override
            public boolean touchDown(int screenX, int screenY, int pointer, int button) {
                Ray ray = camera.getPickRay(screenX, screenY);
                if (Intersector.intersectRayBoundsFast(ray, boardBounds)) {
                    if (!isBoardOpening && !isBoardOpen) {
                        isBoardOpening = true;
                    }
                    return true;
                }
                return false;
            }
        });
    }

    private void applyHingePose(float progress) {
        float eased = Interpolation.smoother.apply(progress);
        if (leftLeafPivot != null) {
            leftLeafPivot.rotation.setFromAxis(Vector3.Z, -180f * (1f - eased));
        }
        if (boardRootNode != null) {
            boardRootNode.translation.set(-1.85f * (1f - eased), 0f, 0.25f * (1f - eased));
        }
        boardInstance.calculateTransforms();
    }

    @Override
    public void render() {
        float delta = Gdx.graphics.getDeltaTime();
        if (isBoardOpening && !isBoardOpen) {
            openTimer += delta;
            float t = Math.min(1f, openTimer / OPEN_DURATION);
            applyHingePose(t);
            if (t >= 1f) {
                isBoardOpen = true;
                isBoardOpening = false;
            }
        }

        Gdx.gl.glViewport(0, 0, Gdx.graphics.getWidth(), Gdx.graphics.getHeight());
        Gdx.gl.glClearColor(0.02f, 0.07f, 0.05f, 1f);
        Gdx.gl.glClear(GL20.GL_COLOR_BUFFER_BIT | GL20.GL_DEPTH_BUFFER_BIT);

        modelBatch.begin(camera);
        modelBatch.render(boardInstance, environment);
        modelBatch.end();
    }

    @Override
    public void dispose() {
        modelBatch.dispose();
        if (sceneAsset != null) sceneAsset.dispose();
    }
}
