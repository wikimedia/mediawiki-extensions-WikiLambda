<template>
	<!--
		WikiLambda Vue interface module for top-level editor encapsulation.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<!-- TODO (T300537): Add a loading indicator, once T300538 is done upstream. -->
	<div id="ext-wikilambda-editor">
		<z-object
			:persistent="true"
			@input="updateZobject"
		></z-object>
		<template v-if="showEditCommand">
			<z-object-publish></z-object-publish>
			<cdx-button
				v-if="isNewZObject"
				@click="navigateToFunctionEditor">
				{{ $i18n( 'wikilambda-create-function' ).text() }}
			</cdx-button>
			<cdx-button
				v-if="isNewZObject"
				@click="changePersistentObjectValue( Constants.Z_TYPE )">
				{{ $i18n( 'wikilambda-create-type' ).text() }}
			</cdx-button>
			<cdx-button
				class="ext-wikilambda-expertModeToggle"
				@click="$store.dispatch( 'toggleExpertMode' )">
				<template v-if="$store.getters.isExpertMode">
					{{ $i18n( 'wikilambda-disable-expert-mode' ).text() }}
				</template>
				<template v-else>
					{{ $i18n( 'wikilambda-enable-expert-mode' ).text() }}
				</template>
			</cdx-button>
			<cdx-message v-if="message.text" :type="message.type">
				{{ message }}
			</cdx-message>
		</template>
	</div>
</template>

<script>
var ZObject = require( '../components/ZObject.vue' ),
	ZObjectPublish = require( '../components/ZObjectPublish.vue' ),
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	CdxMessage = require( '@wikimedia/codex' ).CdxMessage,
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	Constants = require( '../Constants.js' ),
	typeUtils = require( '../mixins/typeUtils.js' );

// @vue/component
module.exports = exports = {
	name: 'z-object-editor',
	components: {
		'z-object': ZObject,
		'z-object-publish': ZObjectPublish,
		'cdx-button': CdxButton,
		'cdx-message': CdxMessage
	},
	mixins: [ typeUtils ],
	data: function () {
		return {
			Constants: Constants
		};
	},
	computed: $.extend( mapGetters( {
		createNewPage: 'isCreateNewPage',
		message: 'getZObjectMessage',
		isNewZObject: 'isNewZObject',
		getZObjectChildrenById: 'getZObjectChildrenById'
	} ), {
		showEditCommand: function () {
			// TODO: Move this into its own vuex store as things gets more complicated and more view settings are set
			// we currently hide the save command for evaluate function call.
			return mw.config.get( 'wgCanonicalSpecialPageName' ) !== 'EvaluateFunctionCall';
		}
	} ),
	methods: $.extend( {},
		mapActions( [ 'submitZObject', 'changeType', 'validateZObject' ] ),
		mapActions( 'router', [ 'navigate' ] ),
		{
			updateZobject: function ( newZobject ) {
				this.zobject = newZobject;
			},

			submit: function () {
				const context = this;
				this.validateZObject().then( function ( validity ) {
					if ( validity.isValid ) {
						context.submitZObject( { summary: context.summary } ).then( function ( pageTitle ) {
							if ( pageTitle ) {
								window.location.href = new mw.Title( pageTitle ).getUrl();
							}
						} );
					}
				} );
			},

			changePersistentObjectValue: function ( type ) {
				var zObject = this.getZObjectChildrenById( 0 ); // We fetch the Root object
				var zPersistentObjectValue =
					this.findKeyInArray( Constants.Z_PERSISTENTOBJECT_VALUE, zObject );

				return this.changeType( {
					id: zPersistentObjectValue.id,
					type: type
				} );
			},

			navigateToFunctionEditor: function () {
				this.navigate( { to: Constants.VIEWS.FUNCTION_EDITOR } );
			}
		}
	)
};
</script>

<style lang="less">
@import 'mediawiki.mixins';
@import './../../lib/sd-base-variables.less';
@import './../../lib/wikimedia-ui-base.less';

.ext-wikilambda-expertModeToggle {
	margin: 1em 0 0 0;
}

.ext-wikilambda-editor-nojswarning {
	display: none;
}
</style>
