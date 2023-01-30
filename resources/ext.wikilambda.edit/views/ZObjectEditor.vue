<template>
	<!--
		WikiLambda Vue interface module for top-level editor encapsulation.

		@copyright 2020– Abstract Wikipedia team; see AUTHORS.txt
		@license MIT
	-->
	<!-- TODO (T300537): Add a loading indicator, once T300538 is done upstream. -->
	<div id="ext-wikilambda-editor">
		<wl-z-object
			:persistent="true"
		></wl-z-object>
		<template v-if="showEditCommand">
			<wl-z-object-publish :is-disabled="!isDirty"></wl-z-object-publish>
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
		<wl-leave-editor-dialog
			:show-dialog="showLeaveEditorDialog"
			:continue-callback="leaveEditorCallback"
			@close-dialog="closeLeaveEditorDialog"
		></wl-leave-editor-dialog>
	</div>
</template>

<script>
var ZObject = require( '../components/ZObject.vue' ),
	ZObjectPublish = require( '../components/ZObjectPublish.vue' ),
	LeaveEditorDialog = require( '../components/editor/LeaveEditorDialog.vue' ),
	CdxButton = require( '@wikimedia/codex' ).CdxButton,
	CdxMessage = require( '@wikimedia/codex' ).CdxMessage,
	mapGetters = require( 'vuex' ).mapGetters,
	mapActions = require( 'vuex' ).mapActions,
	typeUtils = require( '../mixins/typeUtils.js' );

// @vue/component
module.exports = exports = {
	name: 'wl-z-object-editor',
	components: {
		'wl-z-object': ZObject,
		'wl-z-object-publish': ZObjectPublish,
		'wl-leave-editor-dialog': LeaveEditorDialog,
		'cdx-button': CdxButton,
		'cdx-message': CdxMessage
	},
	mixins: [ typeUtils ],
	data: function () {
		return {
			showLeaveEditorDialog: false,
			leaveEditorCallback: ''
		};
	},
	computed: $.extend( mapGetters( {
		createNewPage: 'isCreateNewPage',
		message: 'getZObjectMessage',
		getZObjectChildrenById: 'getZObjectChildrenById',
		getIsZObjectDirty: 'getIsZObjectDirty'
	} ), {
		showEditCommand: function () {
			// TODO: Move this into its own vuex store as things gets more complicated and more view settings are set
			// we currently hide the save command for evaluate function call.
			return mw.config.get( 'wgCanonicalSpecialPageName' ) !== 'EvaluateFunctionCall';
		},
		isDirty: function () {
			return this.getIsZObjectDirty;
		}
	} ),
	methods: $.extend( {},
		mapActions( [ 'submitZObject', 'changeType', 'validateZObject' ] ),
		mapActions( 'router', [ 'navigate' ] ),
		{
			submit: function () {
				const context = this;
				this.validateZObject().then( function ( isValid ) {
					if ( isValid ) {
						context.submitZObject( { summary: context.summary } ).then( function ( pageTitle ) {
							if ( pageTitle ) {
								window.location.href = new mw.Title( pageTitle ).getUrl();
							}
						} );
					}
				} );
			},

			closeLeaveEditorDialog: function () {
				this.showLeaveEditorDialog = false;
			},

			handleClickAway: function ( e ) {
				let target = e.target;

				// Find if what was clicked was a link.
				while ( target && target.tagName !== 'A' ) {
					target = target.parentNode;
					if ( !target ) {
						return;
					}
				}
				if ( target.href && this.isDirty ) {
					this.showLeaveEditorDialog = true;
					e.preventDefault();
					this.leaveEditorCallback = function () {
						window.removeEventListener( 'click', this.handleClickAway );
						window.location.href = target.href;
					}.bind( this );
				}
			}
		}
	),
	mounted: function () {
		this.$emit( 'mounted' );
		window.addEventListener( 'click', this.handleClickAway );
	},
	beforeUnmount: function () {
		window.removeEventListener( 'click', this.handleClickAway );
	}
};
</script>

<style lang="less">
@import 'mediawiki.mixins';

.ext-wikilambda-expertModeToggle {
	margin: 1em 0 0 0;
}

.ext-wikilambda-editor-nojswarning {
	display: none;
}
</style>
